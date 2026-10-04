import type { ExtensionMessage, ExtractPageResponse, SerializedSelection } from '../shared/types'
import { extractPage } from './extract'
import { serializeSelection } from './selection'
import { hideSaveButton, isSaveButtonEvent, markFailed, markQueued, markSaved, showSaveButton } from './save-button'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (r: ExtractPageResponse) => void) => {
    if (message.type !== 'EXTRACT_PAGE') return

    try {
      sendResponse({ ok: true, page: extractPage() })
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  },
)

function send(message: ExtensionMessage) {
  return chrome.runtime.sendMessage(message).catch(() => {
    // background may be unavailable (e.g. extension reloaded); nothing to do
  })
}

function saveSelection(selection: SerializedSelection) {
  send({ type: 'SAVE_SELECTION', selection }).then((res) => {
    if (res?.ok) markSaved()
    else if (res?.queued) markQueued()
    else markFailed()
  })
}

// Selection can end via mouse or keyboard (shift+arrows, ctrl+A)
function captureSelection(e: Event) {
  if (isSaveButtonEvent(e)) return

  const selection = serializeSelection()
  if (!selection) {
    hideSaveButton()
    return
  }

  send({ type: 'SELECTION_CAPTURED', selection })

  const rect = document.getSelection()?.getRangeAt(0).getBoundingClientRect()
  if (rect) showSaveButton(rect, () => saveSelection(selection))
}

document.addEventListener('mouseup', captureSelection)
document.addEventListener('keyup', (e) => {
  if (e.shiftKey || e.key === 'a' || e.key === 'A') captureSelection(e)
})
document.addEventListener('selectionchange', () => {
  if (document.getSelection()?.isCollapsed) hideSaveButton()
})
