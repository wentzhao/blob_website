import { api } from '../api'
import { navigate } from '../router'
import { el, encodePath } from '../dom'
import { toast } from '../ui'

// 新建文章弹窗（列表页 / 概览页共用）
export function openNewModal(root: HTMLElement, _categories: string[]) {
  const langSelect = el('select', { class: 'input' }, [
    el('option', { value: 'zh-cn' }, ['zh-cn']),
    el('option', { value: 'en' }, ['en']),
  ])
  const directorySelect = el('select', { class: 'input' }, [
    el('option', { value: '' }, ['选择目录（必填）']),
  ])
  const pathInput = el('input', {
    class: 'input',
    placeholder: '如 my-post 或 category/my-post',
  })
  const generatedHint = el('small', { class: 'modal-hint' }, [
    '留空将按日期自动生成路径，如 ',
    el('code', {}, [autoPath()]),
  ])

  const overlay = el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal' }, [
      el('h2', { class: 'modal-title' }, ['新建文章']),
      el('label', { class: 'modal-field' }, ['文章路径（可含多级目录）', pathInput, generatedHint]),
      el('label', { class: 'modal-field' }, ['语言', langSelect]),
      el('label', { class: 'modal-field' }, ['目录', directorySelect]),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', onclick: () => overlay.remove() }, ['取消']),
        el('button', { class: 'btn btn-primary', id: 'modal-submit', onclick: submit }, ['创建']),
      ]),
    ]),
  ])
  root.append(overlay)
  pathInput.focus()
  api.meta().then((meta) => {
    for (const directory of meta.directories) {
      directorySelect.append(el('option', { value: directory.id }, [`${'　'.repeat(directory.depth)}${directory.label}`]))
    }
  }).catch((e) => toast((e as Error).message, 'error'))

  async function submit() {
    // 路径留空时自动生成 yyyy/yyyy-mm-dd（按年份分目录，日期为文件名）
    let path = pathInput.value.trim()
    if (!path) path = autoPath()
    const lang = langSelect.value
    try {
      const directory = directorySelect.value
      if (!directory) throw new Error('请选择目录')
      const res = await api.create({ path, lang, directory })
      toast(`已创建 ${res.path}`)
      overlay.remove()
      navigate(`#/edit/${encodePath(res.path)}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
}

// 生成 yyyy/yyyy-mm-dd 路径
export function autoPath(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}/${y}-${m}-${d}`
}
