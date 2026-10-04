import type { ExtensionMessage, SaveResponse } from '../shared/types'
import { buildSelectionPayload, sendToIngest } from './ingest'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse: (r: SaveResponse) => void) => {
    if (message.type === 'SELECTION_CAPTURED') {
      console.log('selection captured', sender.tab?.id, message.selection)
      return
    }

    if (message.type === 'SAVE_SELECTION') {
      sendToIngest(buildSelectionPayload(message.selection))
        .then((res) => sendResponse({ ok: true, documentId: res.document_id }))
        .catch((e) => {
          console.error('ingest failed', e)
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
        })
      return true // keep the channel open for the async response
    }
  },
)
