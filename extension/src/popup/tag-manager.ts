import { listTags, renameTag, type Tag } from '../shared/tags-api'

const listEl = document.getElementById('tag-list') as HTMLElement
const message = document.getElementById('tags-message') as HTMLElement

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

function renderRow(tag: Tag): HTMLElement {
  const row = document.createElement('li')
  row.className = 'tag-row'

  const name = document.createElement('span')
  name.className = 'tag-name'
  name.textContent = tag.name
  const count = document.createElement('span')
  count.className = 'tag-count'
  count.textContent = String(tag.count)
  const edit = button('Rename')
  row.append(name, count, edit)

  edit.addEventListener('click', () => {
    const form = document.createElement('form')
    form.className = 'tag-rename'
    const field = document.createElement('input')
    field.value = tag.name
    field.setAttribute('aria-label', `New name for ${tag.name}`)
    const save = button('Save', 'submit')
    const cancel = button('Cancel')
    form.append(field, save, cancel)
    row.replaceChildren(form)
    field.focus()
    field.select()

    cancel.addEventListener('click', () => row.replaceWith(renderRow(tag)))
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const next = field.value.trim()
      if (!next || next === tag.name) return row.replaceWith(renderRow(tag))
      save.disabled = true
      try {
        const result = await renameTag(tag.id, next)
        await refreshTags()
        const docs = `${result.documentsAffected} document${result.documentsAffected === 1 ? '' : 's'}`
        setMessage(
          result.mergedInto
            ? `Merged into "${result.mergedInto}" (${docs})`
            : `Renamed (${docs})`,
          'success',
        )
      } catch (err) {
        save.disabled = false
        setMessage(err instanceof Error ? err.message : 'Something went wrong', 'error')
      }
    })
  })
  return row
}

export async function refreshTags() {
  setMessage('')
  try {
    const tags = await listTags()
    listEl.replaceChildren(...tags.map(renderRow))
    if (tags.length === 0) setMessage('No tags yet. Save something to get started.')
  } catch (e) {
    listEl.replaceChildren()
    setMessage(e instanceof Error ? e.message : 'Something went wrong', 'error')
  }
}

export function resetTags() {
  listEl.replaceChildren()
  setMessage('')
}
