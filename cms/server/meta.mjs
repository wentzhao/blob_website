// meta.mjs — 分类统计 API
import { Hono } from 'hono'
import { categoryStats, directoryMeta } from './store.mjs'

const meta = new Hono()

// GET /api/meta
meta.get('/', async (c) => {
  try {
    return c.json({ ...(await categoryStats()), directories: await directoryMeta(c.req.query('locale') || 'zh-cn') })
  } catch (error) {
    return c.json({ error: `目录配置加载失败: ${error.message}` }, 500)
  }
})

export { meta }
