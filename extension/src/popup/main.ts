import type { ExtensionMessage, ExtractPageResponse, SaveResponse } from '../shared/types'

const saveButton = document.getElementById('save') as HTMLButtonElement
const toast = document.getElementById('toast') as HTMLDivElement

let toastTimer: number | undefined

function showToast(text: string, kind: 'success' | 'error') {
  toast.textContent = text
  toast.className = `show ${kind}`
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2500)
}

async function savePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('No active tab')

  // Throws on pages where content scripts can't run (chrome://, Web Store, ...)
  const extracted: ExtractPageResponse = await chrome.tabs.sendMessage(tab.id, {
    type: 'EXTRACT_PAGE',
  } satisfies ExtensionMessage)
  if (!extracted.ok) throw new Error(extracted.error)

  const saved: SaveResponse = await chrome.runtime.sendMessage({
    type: 'SAVE_PAGE',
    page: extracted.page,
  } satisfies ExtensionMessage)
  if (!saved?.ok) throw new Error(saved?.error ?? 'Save failed')
}

saveButton.addEventListener('click', async () => {
  saveButton.disabled = true
  try {
    await savePage()
    showToast('Saved to brain ✓', 'success')
  } catch {
    showToast("Couldn't save this page", 'error')
  } finally {
    saveButton.disabled = false
  }
})
