import type { ExtensionMessage, ExtractPageResponse } from '../shared/types'
import { extractPage } from './extract'

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