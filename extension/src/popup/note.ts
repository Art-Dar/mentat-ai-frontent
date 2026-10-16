import { showDocumentTags } from './doc-tags'
import type { ExtensionMessage, SaveResponse } from '../shared/types'

const form = document.getElementById('note-form') as HTMLFormElement
const titleInput = document.getElementById('note-title') as HTMLInputElement
const input = document.getElementById('note-input') as HTMLTextAreaElement
const submit = document.getElementById('note-submit') as HTMLButtonElement
const message = document.getElementById('note-message') as HTMLParagraphElement

function setMessage(text: string, kind: '' | 'error' = '') {
  message.textContent = text
  message.className = kind ? `message ${kind}` : 'message'
}

export function resetNote() {
  form.reset()
  setMessage('')
}

export function initNote() {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) {
      setMessage('Write something first.', 'error')
      return
    }
    submit.disabled = true
    setMessage('')
    try {
      const saved: SaveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        text,
        title: titleInput.value.trim() || undefined,
      } satisfies ExtensionMessage)
      if (saved?.ok) {
        resetNote()
        setMessage('Note saved ✓')
        showDocumentTags(saved.documentId)
      } else if (saved?.queued) {
        resetNote()
        setMessage('Offline: queued, will retry later')
      } else {
        setMessage(saved?.error ?? "Couldn't save the note", 'error')
      }
    } catch {
      setMessage("Couldn't save the note", 'error')
    } finally {
      submit.disabled = false
    }
  })
}
