// store.mjs — 博客文章文件（src/content/blog/**/*.md）的统一读写层
import matter from 'gray-matter'
import { readdir, readFile, writeFile, mkdir, rm, stat, lstat, realpath } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, dirname, basename, extname, relative, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

// 博客内容根目录：cms/server/ -> ../../src/content/blog/
export const BLOG_DIR = fileURLToPath(new URL('../../src/content/blog/', import.meta.url))

export const LANGS = ['zh-cn', 'en']
const DIRECTORY_FILE = fileURLToPath(new URL('../../src/content/directory-tree.json', import.meta.url))
let directoryDefinitionsPromise

async function getDirectoryDefinitions() {
  if (!directoryDefinitionsPromise) {
    directoryDefinitionsPromise = readFile(DIRECTORY_FILE, 'utf-8').then((raw) => {
      const definitions = JSON.parse(raw)
      const byId = new Map()
      for (const definition of definitions) {
        if (!definition.id || byId.has(definition.id)) throw new Error(`目录配置包含重复 ID: ${definition.id}`)
        if (!definition.labels?.['zh-cn'] || !definition.labels?.en) throw new Error(`目录 ${definition.id} 缺少双语标签`)
        if (!definition.descriptions?.['zh-cn'] || !definition.descriptions?.en) throw new Error(`目录 ${definition.id} 缺少双语说明`)
        byId.set(definition.id, definition)
      }
      for (const definition of definitions) {
        if (definition.parentId === definition.id) throw new Error(`目录 ${definition.id} 不能引用自身`)
        if (definition.parentId && !byId.has(definition.parentId)) throw new Error(`目录 ${definition.id} 的父目录不存在: ${definition.parentId}`)
        if (!definition.parentId && !definition.category) throw new Error(`根目录 ${definition.id} 缺少 category`)
        if (definition.parentId && definition.category) throw new Error(`只有根目录可以声明 category: ${definition.id}`)
        const seen = new Set([definition.id])
        let current = definition
        while (current.parentId) {
          if (seen.has(current.parentId)) throw new Error(`目录配置存在循环: ${current.parentId}`)
          seen.add(current.parentId)
          current = byId.get(current.parentId)
        }
      }
      return { definitions, byId }
    })
  }
  return directoryDefinitionsPromise
}

async function categoryForDirectory(directory) {
  const { byId } = await getDirectoryDefinitions()
  let current = byId.get(directory)
  while (current?.parentId) current = byId.get(current.parentId)
  return current?.category || null
}

export async function directoryMeta(locale = 'zh-cn') {
  const { definitions, byId } = await getDirectoryDefinitions()
  return definitions.map((definition) => {
    let depth = 0
    let current = definition
    while (current.parentId) {
      depth++
      current = byId.get(current.parentId)
    }
    return {
      id: definition.id,
      parentId: definition.parentId || null,
      depth,
      label: definition.labels[locale] || definition.labels['zh-cn'],
    }
  })
}

// 校验相对路径（防止目录穿越）
export function safeRel(rel) {
  if (!rel || typeof rel !== 'string') return null
  const normalized = rel.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\0')) return null
  return normalized
}

export function blogPath(rel) {
  return join(BLOG_DIR, ...rel.split('/'))
}

function isWithin(base, target) {
  const rel = relative(base, target)
  return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel)
}

// 检查已有路径组件和最终真实路径，避免 CMS 写入跟随 blog 目录内的符号链接
export async function isSafeBlogPath(rel) {
  const normalized = safeRel(rel)
  if (!normalized) return false
  const base = await realpath(resolve(BLOG_DIR)).catch(() => null)
  if (!base) return false

  let current = base
  for (const segment of normalized.split('/')) {
    current = join(current, segment)
    try {
      if ((await lstat(current)).isSymbolicLink()) return false
    } catch (error) {
      if (error.code !== 'ENOENT') return false
      break
    }
  }

  const target = await realpath(blogPath(normalized)).catch(() => null)
  return !target || isWithin(base, target)
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

export function dateStr(v) {
  if (!v) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

function strictDateStr(v, field) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' && !v.trim()) return ''
  if (v instanceof Date && (Number.isNaN(v.valueOf()) || v.getUTCHours() !== 0 || v.getUTCMinutes() !== 0 || v.getUTCSeconds() !== 0 || v.getUTCMilliseconds() !== 0)) {
    throw new Error(`${field} 必须是 date-only 值`)
  }
  const value = v instanceof Date ? dateStr(v) : String(v).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} 必须使用 YYYY-MM-DD 格式`)
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} 必须是有效的日历日期`)
  }
  return value
}

function rawFrontmatterValue(raw, field) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return undefined
  const prefix = `${field}:`
  const line = match[1].split(/\r?\n/).find((item) => item.startsWith(prefix))
  if (!line) return undefined
  const value = line.slice(prefix.length).trim().replace(/\s+#.*$/, '')
  if (value === '' || value === 'null' || value === '~') return null
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function validateRawUpdatedDate(raw) {
  const value = rawFrontmatterValue(raw, 'updatedDate')
  if (value !== undefined && value !== null) strictDateStr(value, 'updatedDate')
}

function withoutUpdateMetadata(data) {
  const result = {}
  for (const key of Object.keys(data).sort()) {
    if (key === 'updatedDate' || key === 'draft') continue
    result[key] = data[key]
  }
  return result
}

function dataSnapshot(data) {
  return JSON.stringify(withoutUpdateMetadata(data))
}

function localDateStr(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 规范化 frontmatter 字段
export function normalizeData(data) {
  const d = { ...(data || {}) }
  if (d.pubDate) d.pubDate = dateStr(d.pubDate)
  if (Object.prototype.hasOwnProperty.call(d, 'updatedDate')) {
    const updatedDate = strictDateStr(d.updatedDate, 'updatedDate')
    if (updatedDate) d.updatedDate = updatedDate
    else delete d.updatedDate
  }
  if (d.updatedDate && d.pubDate && updatedDateBeforePubDate(d.updatedDate, d.pubDate)) {
    throw new Error('updatedDate 不能早于 pubDate')
  }
  if (typeof d.draft !== 'boolean') d.draft = d.draft ? true : false
  if (typeof d.pinTop !== 'number') d.pinTop = Number(d.pinTop) || 0
  return d
}

function updatedDateBeforePubDate(updatedDate, pubDate) {
  return new Date(`${updatedDate}T00:00:00.000Z`).valueOf() < new Date(`${pubDate}T00:00:00.000Z`).valueOf()
}

async function slugIdState(rel) {
  const dir = blogPath(rel)
  const ids = new Set()
  for (const lang of LANGS) {
    try {
      const { data } = matter(await readFile(join(dir, `${lang}.md`), 'utf-8'))
      if (data.slugId) ids.add(String(data.slugId))
    } catch {
      /* 该语言版本不存在 */
    }
  }
  return { slugId: ids.values().next().value || null, inconsistent: ids.size > 1 }
}

async function directoryState(rel) {
  const directories = new Set()
  let files = 0
  for (const lang of LANGS) {
    try {
      const { data } = matter(await readFile(join(blogPath(rel), `${lang}.md`), 'utf-8'))
      files++
      if (data.directory) directories.add(String(data.directory))
    } catch {
      /* 该语言版本不存在 */
    }
  }
  return { directory: directories.values().next().value || null, inconsistent: directories.size > 1, files }
}

// 扫描所有文章（按文件夹分组，每个文件夹 = 一篇逻辑文章的多语言版本）
export async function scanArticles() {
  const byPath = new Map()
  for await (const file of walk(BLOG_DIR)) {
    if (extname(file) !== '.md') continue
    if (basename(file).startsWith('_')) continue
    const rel = file.slice(BLOG_DIR.length).replace(/\\/g, '/').replace(/^\//, '')
    const parts = rel.split('/')
    const lang = parts.pop().replace(/\.md$/, '')
    if (!LANGS.includes(lang)) continue
    const path = parts.join('/')
    if (!byPath.has(path)) byPath.set(path, { files: {} })
    byPath.get(path).files[lang] = file
  }

  const articles = []
  for (const [path, { files }] of byPath) {
    const langs = Object.keys(files).sort()
    let base = null
    const fileData = {}
    for (const lang of langs) {
      const { data } = matter(await readFile(files[lang], 'utf-8'))
      fileData[lang] = data
      if (lang === 'zh-cn' || !base) base = data
    }
    articles.push({
      path,
      langs,
      title: base?.title || '',
      description: base?.description || '',
      category: base?.category || '',
      pubDate: dateStr(base?.pubDate),
      draft: base?.draft ?? false,
      pinTop: base?.pinTop ?? 0,
    })
  }
  return articles
}

// 读取一篇文章的全部语言版本
export async function readArticle(path) {
  const rel = safeRel(path)
  if (!rel) return null
  if (!await isSafeBlogPath(rel)) return null
  const dir = blogPath(rel)
  const files = {}
  for (const lang of LANGS) {
    if (!await isSafeBlogPath(`${rel}/${lang}.md`)) continue
    try {
      const raw = await readFile(join(dir, `${lang}.md`), 'utf-8')
      validateRawUpdatedDate(raw)
      const { data, content } = matter(raw)
      files[lang] = { content, data: normalizeData(data) }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      /* 该语言版本不存在 */
    }
  }
  if (Object.keys(files).length === 0) return null
  return { path: rel, files }
}

// 保存文章；文件夹位置以路径为准，slugId 是同一目录各语言版本共用的稳定元数据
export async function saveArticle(path, lang, payload) {
  const rel = safeRel(path)
  if (!rel) return { error: '无效路径' }
  if (!LANGS.includes(lang)) return { error: `不支持的语言: ${lang}` }
  if (!await isSafeBlogPath(rel)) return { error: '文章路径不能包含符号链接' }

  let existingArticle
  try {
    existingArticle = await readArticle(rel)
  } catch (error) {
    return { error: error?.message || '无法读取现有文章' }
  }
  const existingFile = existingArticle?.files[lang]
  const hasUpdatedDateInput = Object.prototype.hasOwnProperty.call(payload.data || {}, 'updatedDate')
  let data
  try {
    data = normalizeData(payload.data || {})
  } catch (error) {
    return { error: error?.message || '更新时间无效' }
  }
  if (!hasUpdatedDateInput && existingFile?.data.updatedDate) {
    data.updatedDate = existingFile.data.updatedDate
  }
  const updatedDateWasChanged = hasUpdatedDateInput
    && data.updatedDate !== existingFile?.data.updatedDate
  const slugState = await slugIdState(rel)
  if (slugState.inconsistent) return { error: '同一文章目录存在不一致的 slugId，请先人工处理' }
  const stableSlugId = slugState.slugId || (data.slugId ? String(data.slugId) : randomUUID())
  data.slugId = stableSlugId
  const existingDirectory = await directoryState(rel)
  if (existingDirectory.inconsistent) return { error: '同一文章目录存在不一致的 directory，请先人工处理' }
  const hasRequestedDirectory = typeof data.directory === 'string'
  const requestedDirectory = hasRequestedDirectory ? data.directory.trim() : ''
  const existingDirectoryId = existingDirectory.directory || ''
  if (existingDirectory.files === 2 && hasRequestedDirectory && requestedDirectory !== existingDirectoryId) {
    return { error: '已有中英文版本的文章不能在 CMS 中修改 directory，请使用受控迁移操作' }
  }
  const directory = hasRequestedDirectory ? requestedDirectory : existingDirectory.directory
  if (!directory && !data.draft) return { error: '公开文章必须提供有效 directory' }
  if (directory) {
    const category = await categoryForDirectory(directory)
    if (!category) return { error: `未知 directory ID: ${directory}` }
    data.directory = directory
    data.category = category
  } else {
    data.directory = ''
    data.category = ''
  }

  const contentChanged = existingFile
    ? payload.body !== existingFile.content || dataSnapshot(data) !== dataSnapshot(existingFile.data)
    : false
  if (contentChanged && !updatedDateWasChanged) {
    data.updatedDate = localDateStr()
  }
  if (data.updatedDate && updatedDateBeforePubDate(data.updatedDate, data.pubDate)) {
    return { error: 'updatedDate 不能早于 pubDate' }
  }

  const writeOne = async (p, l, d, body) => {
    const file = join(blogPath(p), `${l}.md`)
    await mkdir(dirname(file), { recursive: true })
    if (!await isSafeBlogPath(`${p}/${l}.md`)) throw new Error('文章路径不能包含符号链接')
    await writeFile(file, matter.stringify(body || '', d), 'utf-8')
  }

  await writeOne(rel, lang, data, payload.body)
  return { path: rel }
}

// 新建文章（创建文件夹 + 模板文件）
export async function createArticle(path, lang, requestedDirectory) {
  const rel = safeRel(path)
  if (!rel) return { error: '无效路径' }
  if (!LANGS.includes(lang)) return { error: `不支持的语言: ${lang}` }
  if (!await isSafeBlogPath(rel)) return { error: '文章路径不能包含符号链接' }

  const slugState = await slugIdState(rel)
  if (slugState.inconsistent) return { error: '同一文章目录存在不一致的 slugId，请先人工处理' }
  const dir = blogPath(rel)
  const exists = await stat(join(dir, `${lang}.md`)).then(() => true).catch(() => false)
  if (exists) return { error: '文章已存在' }
  const existingDirectory = await directoryState(rel)
  if (existingDirectory.inconsistent) return { error: '同一文章目录存在不一致的 directory，请先人工处理' }
  if (existingDirectory.directory && requestedDirectory && requestedDirectory !== existingDirectory.directory) {
    return { error: `译文必须继承兄弟文件的 directory: ${existingDirectory.directory}` }
  }
  const directory = existingDirectory.directory || requestedDirectory
  if (!directory) return { error: '首次创建文章必须选择有效 directory' }
  const category = await categoryForDirectory(directory)
  if (!category) return { error: `未知 directory ID: ${directory}` }

  const data = normalizeData({
    title: rel.split('/').pop(),
    pubDate: new Date().toISOString().slice(0, 10),
    description: '',
    image: '',
    draft: true,
    slugId: slugState.slugId || randomUUID(),
    directory,
    category,
    pinTop: 0,
  })
  await mkdir(dir, { recursive: true })
  if (!await isSafeBlogPath(`${rel}/${lang}.md`)) return { error: '文章路径不能包含符号链接' }
  await writeFile(join(dir, `${lang}.md`), matter.stringify('', data), 'utf-8')
  return { path: rel }
}

// 删除整篇文章（整个文件夹）
export async function deleteArticle(path) {
  const rel = safeRel(path)
  if (!rel) return { error: '无效路径' }
  if (!await isSafeBlogPath(rel)) return { error: '文章路径不能包含符号链接' }
  const dir = blogPath(rel)
  const st = await stat(dir).then((s) => s).catch(() => null)
  if (!st?.isDirectory()) return { error: '文章不存在' }
  await rm(dir, { recursive: true, force: true })
  return { ok: true }
}

// 统计分类
export async function categoryStats() {
  const list = await scanArticles()
  const counts = new Map()
  let drafts = 0
  for (const a of list) {
    if (a.draft) drafts++
    if (a.category) counts.set(a.category, (counts.get(a.category) || 0) + 1)
  }
  const categories = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  return { total: list.length, drafts, categories }
}

// 概览统计：在前端展示文章信息（含正文字数，需读取全部文件内容）
export async function overviewStats() {
  const base = await categoryStats()
  const list = await scanArticles()

  let pinned = 0
  const langCount = { 'zh-cn': 0, en: 0 }
  let both = 0
  for (const a of list) {
    if (a.pinTop) pinned++
    if (a.langs.includes('zh-cn')) langCount['zh-cn']++
    if (a.langs.includes('en')) langCount.en++
    if (a.langs.includes('zh-cn') && a.langs.includes('en')) both++
  }

  // 正文字数：忽略 frontmatter 与代码块/行内代码，中文字符 + 英文单词粗略统计
  let cjk = 0
  let latin = 0
  for await (const file of walk(BLOG_DIR)) {
    if (extname(file) !== '.md') continue
    if (basename(file).startsWith('_')) continue
    const lang = basename(file).replace(/\.md$/, '')
    if (!LANGS.includes(lang)) continue
    const { content } = matter(await readFile(file, 'utf-8'))
    const body = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
    cjk += (body.match(/[\u4e00-\u9fff]/g) || []).length
    latin += (body.match(/[A-Za-z0-9]+/g) || []).length
  }

  const recent = [...list]
    .sort(
      (a, b) =>
        (b.pinTop - a.pinTop) ||
        (b.pubDate || '').localeCompare(a.pubDate || ''),
    )
    .slice(0, 8)

  return {
    total: base.total,
    published: base.total - base.drafts,
    drafts: base.drafts,
    pinned,
    categories: base.categories,
    langs: langCount,
    both,
    words: { cjk, latin, total: cjk + latin },
    recent,
  }
}
