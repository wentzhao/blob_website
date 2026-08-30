// articles.mjs — 文章 CRUD API
import { Hono } from 'hono'
import {
  scanArticles, readArticle, saveArticle, createArticle, deleteArticle, LANGS,
} from './store.mjs'
import { basename, extname } from 'node:path'
import matter from 'gray-matter'

const articles = new Hono()

const PREFIX = '/api/articles'

// 解析通配路由的剩余路径
function rest(c) {
  const p = c.req.path
  const raw = p.slice(PREFIX.length)
  return decodeURIComponent(raw.replace(/^\//, ''))
}

// GET /api/articles?q=&category=&draft=all|published|drafts
articles.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim().toLowerCase()
  const category = (c.req.query('category') || '').trim()
  const draft = c.req.query('draft') || 'all'

  let list = await scanArticles()
  if (category) list = list.filter((a) => a.category === category)
  if (draft === 'published') list = list.filter((a) => !a.draft)
  if (draft === 'drafts') list = list.filter((a) => a.draft)
  if (q) {
    list = list.filter((a) =>
      `${a.title} ${a.description} ${a.path} ${a.category}`.toLowerCase().includes(q),
    )
  }
  list.sort(
    (a, b) =>
      (b.pinTop - a.pinTop) ||
      (b.pubDate || '').localeCompare(a.pubDate || ''),
  )
  return c.json({ articles: list })
})

// GET /api/articles/<path>
articles.get('/*', async (c) => {
  const rel = rest(c)
  let article
  try {
    article = await readArticle(rel)
  } catch (error) {
    return c.json({ error: error?.message || '文章内容校验失败' }, 422)
  }
  if (!article) return c.json({ error: '文章不存在' }, 404)
  return c.json(article)
})

// POST /api/articles  { path, lang? }
articles.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body?.path) return c.json({ error: 'path 不能为空' }, 400)
  const result = await createArticle(body.path, body.lang || 'zh-cn', body.directory)
  if (result.error) return c.json(result, 400)
  return c.json(result)
})

// POST /api/articles/import  multipart: file + path + lang + directory
articles.post('/import', async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  const path = String(form?.get('path') || '').trim()
  const lang = String(form?.get('lang') || 'zh-cn')
  const directory = String(form?.get('directory') || '').trim()

  if (!file || typeof file.text !== 'function') return c.json({ error: '请选择 Markdown 文件' }, 400)
  if (extname(file.name || '').toLowerCase() !== '.md') {
    return c.json({ error: '只支持导入 .md Markdown 文件' }, 400)
  }
  if (!path) return c.json({ error: '文章路径不能为空' }, 400)
  if (!directory) return c.json({ error: '请选择目录' }, 400)
  if (!LANGS.includes(lang)) return c.json({ error: `不支持的语言: ${lang}` }, 400)

  let existing
  try {
    existing = await readArticle(path)
  } catch (error) {
    return c.json({ error: error?.message || '无法读取目标文章' }, 400)
  }
  if (existing?.files[lang]) {
    return c.json({ error: `文章语言版本已存在: ${path}/${lang}.md，请更换路径或语言` }, 409)
  }

  let parsed
  try {
    parsed = matter(await file.text())
  } catch (error) {
    return c.json({ error: `Markdown frontmatter 解析失败: ${error?.message || error}` }, 400)
  }

  const sourceName = basename(path)
  const importedData = parsed.data && typeof parsed.data === 'object' ? { ...parsed.data } : {}
  const data = {
    title: typeof importedData.title === 'string' && importedData.title.trim() ? importedData.title : sourceName,
    pubDate: importedData.pubDate || new Date().toISOString().slice(0, 10),
    description: typeof importedData.description === 'string' ? importedData.description : '',
    image: typeof importedData.image === 'string' ? importedData.image : '',
    // 导入默认保持草稿，避免本地文件被意外公开；可在编辑器中手动发布
    draft: true,
    directory,
    pinTop: typeof importedData.pinTop === 'number' ? importedData.pinTop : 0,
  }

  const result = await saveArticle(path, lang, { data, body: parsed.content })
  if (result.error) return c.json(result, 400)
  return c.json(result)
})

// PUT /api/articles/<path>/<lang>  { data, body }
articles.put('/*', async (c) => {
  const rel = rest(c)
  const idx = rel.lastIndexOf('/')
  if (idx < 0) return c.json({ error: '路径格式错误，应为 /api/articles/<path>/<lang>' }, 400)
  const path = rel.slice(0, idx)
  const lang = rel.slice(idx + 1)
  if (!LANGS.includes(lang)) return c.json({ error: `不支持的语言: ${lang}` }, 400)

  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return c.json({ error: '无效请求体' }, 400)
  const result = await saveArticle(path, lang, body)
  if (result.error) return c.json(result, 400)
  return c.json(result)
})

// DELETE /api/articles/<path>
articles.delete('/*', async (c) => {
  const rel = rest(c)
  const result = await deleteArticle(rel)
  if (result.error) return c.json(result, 404)
  return c.json(result)
})

export { articles }
