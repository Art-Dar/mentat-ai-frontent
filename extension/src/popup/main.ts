import * as auth from '../shared/auth-storage'
import type { ExtensionMessage, ExtractPageResponse, SaveResponse } from '../shared/types'

const saveButton = document.getElementById('save') as HTMLButtonElement
const toast = document.getElementById('toast') as HTMLDivElement

let toastTimer: number | undefined

function showToast(text: string, kind: 'success' | 'error' | 'queued') {
  toast.textContent = text
  toast.className = `show ${kind}`
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2500)
}

// Returns true if saved, false if queued for a later retry; throws if neither
async function savePage(): Promise<boolean> {
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
  if (saved?.ok) return true
  if (saved?.queued) return false
  throw new Error(saved?.error ?? 'Save failed')
}

saveButton.addEventListener('click', async () => {
  saveButton.disabled = true
  try {
    if (await savePage()) showToast('Saved to brain ✓', 'success')
    else showToast('Offline: queued, will retry later', 'queued')
  } catch {
    showToast("Couldn't save this page", 'error')
  } finally {
    saveButton.disabled = false
  }
})

console.log('popup loaded')

// Debug handle for manual testing from the popup DevTools console
;(globalThis as any).mentatAuth = auth
