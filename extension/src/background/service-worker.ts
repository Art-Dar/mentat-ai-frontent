import * as auth from '../shared/auth-storage'
import type { ExtensionMessage, IngestPayload, SaveResponse } from '../shared/types'
import { buildPagePayload, buildSelectionPayload, sendToIngest } from './ingest'

function save(payload: IngestPayload, sendResponse: (r: SaveResponse) => void) {
  sendToIngest(payload)
    .then((res) => sendResponse({ ok: true, documentId: res.document_id }))
    .catch((e) => {
      console.error('ingest failed', e)
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
    })
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse: (r: SaveResponse) => void) => {
    if (message.type === 'SELECTION_CAPTURED') {
      console.log('selection captured', sender.tab?.id, message.selection)
      return
    }

    if (message.type === 'SAVE_SELECTION') {
      save(buildSelectionPayload(message.selection), sendResponse)
      return true // keep the channel open for the async response
    }

    if (message.type === 'SAVE_PAGE') {
      save(buildPagePayload(message.page), sendResponse)
      return true
    }
  },
)

console.log('background loaded')

// Debug handle for manual testing from the service worker DevTools console
;(globalThis as any).mentatAuth = auth
