import * as auth from '../shared/auth-storage'
import { askQuestion } from '../shared/ask-api'
import { AskError } from '../shared/ask-error'
import type {
  AskMessageResponse,
  ExtensionMessage,
  IngestPayload,
  SaveResponse,
} from '../shared/types'
import * as retryQueue from '../shared/retry-queue'
import { buildNotePayload, buildPagePayload, buildSelectionPayload, IngestError, sendToIngest } from './ingest'

function save(payload: IngestPayload, sendResponse: (r: SaveResponse) => void) {
  sendToIngest(payload)
    .then((res) => sendResponse({ ok: true, documentId: res.document_id }))
    .catch(async (e) => {
      console.error('ingest failed', e)
      const error = e instanceof Error ? e.message : String(e)
      const queued = e instanceof IngestError && e.retryable
      if (queued) await retryQueue.enqueue(payload, error)
      sendResponse({ ok: false, error, queued })
    })
}

function ask(question: string, sendResponse: (r: AskMessageResponse) => void) {
  askQuestion(question)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((e) => {
      console.error('ask failed', e)
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        retryable: e instanceof AskError && e.retryable,
      })
    })
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (r: SaveResponse | AskMessageResponse) => void,
  ) => {
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

    if (message.type === 'SAVE_NOTE') {
      save(buildNotePayload(message.text, message.title), sendResponse)
      return true
    }

    if (message.type === 'ASK') {
      ask(message.question, sendResponse)
      return true
    }
  },
)

console.log('background loaded')

// Debug handle for manual testing from the service worker DevTools console
;(globalThis as any).mentatAuth = auth
;(globalThis as any).mentatQueue = retryQueue
