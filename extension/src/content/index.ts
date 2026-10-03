import type { ExtensionMessage, ExtractPageResponse } from '../shared/types'
import { extractPage } from './extract'
import { serializeSelection } from './selection'

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

// Selection can end via mouse or keyboard (shift+arrows, ctrl+A)
function captureSelection() {
  const selection = serializeSelection()
  if (!selection) return

  const message: ExtensionMessage = { type: 'SELECTION_CAPTURED', selection }
  chrome.runtime.sendMessage(message).catch(() => {
    // background may be unavailable (e.g. extension reloaded); nothing to do
  })
}

document.addEventListener('mouseup', captureSelection)
document.addEventListener('keyup', (e) => {
  if (e.shiftKey || e.key === 'a' || e.key === 'A') captureSelection()
})
