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

// 导入本地 Markdown 文件（列表页 / 概览页共用）
export function openImportModal(root: HTMLElement) {
  let selectedFile: File | null = null
  const fileInput = el('input', { class: 'input', type: 'file', accept: '.md,text/markdown' })
  const pathInput = el('input', {
    class: 'input',
    placeholder: '如 my-post 或 category/my-post（默认使用文件名）',
  })
  const langSelect = el('select', { class: 'input' }, [
    el('option', { value: 'zh-cn' }, ['zh-cn']),
    el('option', { value: 'en' }, ['en']),
  ])
  const directorySelect = el('select', { class: 'input' }, [
    el('option', { value: '' }, ['选择目录（必填）']),
  ])

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files?.[0] || null
    if (selectedFile) pathInput.value = selectedFile.name.replace(/\.md$/i, '')
  })
  const overlay = el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal' }, [
      el('h2', { class: 'modal-title' }, ['导入 Markdown']),
      el('label', { class: 'modal-field' }, ['Markdown 文件（仅支持 .md）', fileInput]),
      el('label', { class: 'modal-field' }, ['文章路径', pathInput]),
      el('label', { class: 'modal-field' }, ['语言', langSelect]),
      el('label', { class: 'modal-field' }, [
        '目录',
        directorySelect,
        el('small', { class: 'modal-hint' }, ['导入后默认为草稿，可在编辑器中发布。']),
      ]),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', onclick: () => overlay.remove() }, ['取消']),
        el('button', { class: 'btn btn-primary', id: 'modal-import-submit', onclick: submit }, ['导入']),
      ]),
    ]),
  ])
  root.append(overlay)
  fileInput.focus()

  api.meta().then((meta) => {
    for (const directory of meta.directories) {
      directorySelect.append(el('option', { value: directory.id }, [`${'　'.repeat(directory.depth)}${directory.label}`]))
    }
  }).catch((e) => toast((e as Error).message, 'error'))

  async function submit() {
    const path = pathInput.value.trim()
    const directory = directorySelect.value
    if (!selectedFile) return toast('请选择 Markdown 文件', 'error')
    if (!path) return toast('文章路径不能为空', 'error')
    if (!directory) return toast('请选择目录', 'error')
    const button = document.querySelector('#modal-import-submit') as HTMLButtonElement | null
    if (button) button.disabled = true
    try {
      const res = await api.importArticle(selectedFile, { path, lang: langSelect.value, directory })
      toast(`已导入 ${res.path}`)
      overlay.remove()
      navigate(`#/edit/${encodePath(res.path)}`)
    } catch (e) {
      toast((e as Error).message, 'error')
      if (button) button.disabled = false
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
