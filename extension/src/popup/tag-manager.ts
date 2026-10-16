import { listTags, renameTag, type Tag } from '../shared/tags-api'

const listEl = document.getElementById('tag-list') as HTMLElement
const message = document.getElementById('tags-message') as HTMLElement

let allTags: Tag[] = []

function setMessage(text: string, kind: 'success' | 'error' | '' = '') {
  message.textContent = text
  message.className = `message ${kind}`
}

function button(label: string, type: 'button' | 'submit' = 'button') {
  const el = document.createElement('button')
  el.type = type
  el.className = 'link'
  el.textContent = label
  return el
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// Replaces the row with a question and Confirm/Cancel; runs `action` on Confirm
function askConfirm(row: HTMLElement, tag: Tag, question: string, action: () => Promise<void>) {
  const box = document.createElement('div')
  box.className = 'tag-confirm'
  const text = document.createElement('span')
  text.textContent = question
  const yes = button('Confirm')
  const no = button('Cancel')
  box.append(text, yes, no)
  row.replaceChildren(box)

  no.addEventListener('click', () => row.replaceWith(renderRow(tag)))
  yes.addEventListener('click', async () => {
    yes.disabled = true
    no.disabled = true
    try {
      await action()
    } catch (err) {
      row.replaceWith(renderRow(tag))
      setMessage(err instanceof Error ? err.message : 'Something went wrong', 'error')
    }
  })
}

async function applyRename(tag: Tag, name: string) {
  const result = await renameTag(tag.id, name)
  await refreshTags()
  const docs = plural(result.documentsAffected, 'document')
  setMessage(
    result.mergedInto ? `Merged into "${result.mergedInto}" (${docs})` : `Renamed (${docs})`,
    'success',
  )
}

function startRename(row: HTMLElement, tag: Tag) {
  const form = document.createElement('form')
  form.className = 'tag-rename'
  const field = document.createElement('input')
  field.value = tag.name
  field.setAttribute('aria-label', `New name for ${tag.name}`)
  const next = button('Rename', 'submit')
  const cancel = button('Cancel')
  form.append(field, next, cancel)
  row.replaceChildren(form)
  field.focus()
  field.select()

  cancel.addEventListener('click', () => row.replaceWith(renderRow(tag)))
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = field.value.trim()
    if (!name || name === tag.name) return row.replaceWith(renderRow(tag))
    const clash = allTags.find((t) => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())
    const question = clash
      ? `"${name}" exists. Merge "${tag.name}" into it?`
      : `Rename "${tag.name}" to "${name}"? (${plural(tag.count, 'document')})`
    askConfirm(row, tag, question, () => applyRename(tag, clash ? clash.name : name))
  })
}

function startMerge(row: HTMLElement, tag: Tag) {
  const others = allTags.filter((t) => t.id !== tag.id)
  if (others.length === 0) {
    setMessage('You need at least two tags to merge.', 'error')
    return
  }
  const form = document.createElement('form')
  form.className = 'tag-rename'
  const select = document.createElement('select')
  select.setAttribute('aria-label', `Merge ${tag.name} into`)
  for (const t of others) select.add(new Option(`${t.name} (${t.count})`, t.id))
  const go = button('Merge', 'submit')
  const cancel = button('Cancel')
  form.append(select, go, cancel)
  row.replaceChildren(form)
  select.focus()

  cancel.addEventListener('click', () => row.replaceWith(renderRow(tag)))
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const target = others.find((t) => t.id === select.value)
    if (!target) return
    askConfirm(
      row,
      tag,
      `Merge "${tag.name}" into "${target.name}"? "${tag.name}" will be removed.`,
      () => applyRename(tag, target.name),
    )
  })
}

function renderRow(tag: Tag): HTMLElement {
  const row = document.createElement('li')
  row.className = 'tag-row'

  const name = document.createElement('span')
  name.className = 'tag-name'
  name.textContent = tag.name
  const count = document.createElement('span')
  count.className = 'tag-count'
  count.textContent = String(tag.count)
  const rename = button('Rename')
  const merge = button('Merge')
  row.append(name, count, rename, merge)

  rename.addEventListener('click', () => startRename(row, tag))
  merge.addEventListener('click', () => startMerge(row, tag))
  return row
}

export async function refreshTags() {
  setMessage('')
  try {
    allTags = await listTags()
    listEl.replaceChildren(...allTags.map(renderRow))
    if (allTags.length === 0) setMessage('No tags yet. Save something to get started.')
  } catch (e) {
    allTags = []
    listEl.replaceChildren()
    setMessage(e instanceof Error ? e.message : 'Something went wrong', 'error')
  }
}

export function resetTags() {
  allTags = []
  listEl.replaceChildren()
  setMessage('')
}
