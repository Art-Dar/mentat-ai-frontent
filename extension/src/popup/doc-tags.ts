import {
  addDocumentTags,
  getDocumentTags,
  removeDocumentTag,
  type DocumentTag,
} from '../shared/tags-api'

const panel = document.getElementById('doc-tags') as HTMLElement
const list = document.getElementById('doc-tags-list') as HTMLElement
const status = document.getElementById('doc-tags-status') as HTMLElement
const form = document.getElementById('doc-tags-form') as HTMLFormElement
const input = document.getElementById('doc-tags-input') as HTMLInputElement

// Auto-tagging runs in the backend pipeline after the save, so tags appear a bit later
const POLL_INTERVAL_MS = 1500
const POLL_ATTEMPTS = 8

// The document the panel currently shows; async work for an older one is dropped
let currentId: string | null = null

function render(tags: DocumentTag[]) {
  list.replaceChildren(
    ...tags.map((tag) => {
      const chip = document.createElement('span')
      chip.className = `chip${tag.assignedBy === 'auto' ? ' auto' : ''}`
      chip.append(tag.name)
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'chip-remove'
      remove.textContent = '×'
      remove.setAttribute('aria-label', `Remove tag ${tag.name}`)
      remove.addEventListener('click', () => void removeTag(tag.name))
      chip.append(remove)
      return chip
    }),
  )
}

function setStatus(text: string, error = false) {
  status.textContent = text
  status.className = error ? 'message error' : 'message'
}

function errorText(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong'
}

async function removeTag(name: string) {
  const id = currentId
  if (!id) return
  try {
    await removeDocumentTag(id, name)
    if (id !== currentId) return
    render(await getDocumentTags(id))
    setStatus('')
  } catch (e) {
    setStatus(errorText(e), true)
  }
}

async function poll(id: string) {
  setStatus('Tagging…')
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    try {
      const tags = await getDocumentTags(id)
      if (id !== currentId) return
      render(tags)
      if (tags.length > 0) return setStatus('')
    } catch (e) {
      if (id !== currentId) return
      return setStatus(errorText(e), true)
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    if (id !== currentId) return
  }
  setStatus('No tags yet. Add your own below.')
}

export function showDocumentTags(documentId: string) {
  currentId = documentId
  panel.hidden = false
  list.replaceChildren()
  input.value = ''
  void poll(documentId)
}

export function resetDocumentTags() {
  currentId = null
  panel.hidden = true
  list.replaceChildren()
  setStatus('')
  input.value = ''
}

export function initDocumentTags() {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const id = currentId
    const names = input.value
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 20)
    if (!id || names.length === 0) return
    input.disabled = true
    try {
      const tags = await addDocumentTags(id, names)
      if (id !== currentId) return
      render(tags)
      input.value = ''
      setStatus('')
    } catch (err) {
      setStatus(errorText(err), true)
    } finally {
      input.disabled = false
    }
  })
}
