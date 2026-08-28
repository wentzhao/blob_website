// store.mjs — 博客文章文件（src/content/blog/**/*.md）的统一读写层
import matter from 'gray-matter'
import { readdir, readFile, writeFile, mkdir, rm, stat, lstat, realpath } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, dirname, basename, extname, relative, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

// 博客内容根目录：cms/server/ -> ../../src/content/blog/
export const BLOG_DIR = fileURLToPath(new URL('../../src/content/blog/', import.meta.url))

export const LANGS = ['zh-cn', 'en']

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

// 规范化 frontmatter 字段
export function normalizeData(data) {
  const d = { ...(data || {}) }
  if (d.pubDate) d.pubDate = dateStr(d.pubDate)
  if (typeof d.draft !== 'boolean') d.draft = d.draft ? true : false
  if (typeof d.pinTop !== 'number') d.pinTop = Number(d.pinTop) || 0
  return d
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
      const { data, content } = matter(raw)
      files[lang] = { content, data: normalizeData(data) }
    } catch {
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

  const data = normalizeData(payload.data || {})
  const slugState = await slugIdState(rel)
  if (slugState.inconsistent) return { error: '同一文章目录存在不一致的 slugId，请先人工处理' }
  const stableSlugId = slugState.slugId || (data.slugId ? String(data.slugId) : randomUUID())
  data.slugId = stableSlugId

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
export async function createArticle(path, lang) {
  const rel = safeRel(path)
  if (!rel) return { error: '无效路径' }
  if (!LANGS.includes(lang)) return { error: `不支持的语言: ${lang}` }
  if (!await isSafeBlogPath(rel)) return { error: '文章路径不能包含符号链接' }

  const slugState = await slugIdState(rel)
  if (slugState.inconsistent) return { error: '同一文章目录存在不一致的 slugId，请先人工处理' }
  const dir = blogPath(rel)
  const exists = await stat(join(dir, `${lang}.md`)).then(() => true).catch(() => false)
  if (exists) return { error: '文章已存在' }

  const data = normalizeData({
    title: rel.split('/').pop(),
    pubDate: new Date().toISOString().slice(0, 10),
    description: '',
    image: '',
    draft: true,
    slugId: slugState.slugId || randomUUID(),
    category: '',
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
