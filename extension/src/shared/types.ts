export interface ExtractedPage {
  url: string
  title: string
  text: string
  excerpt: string | null
  byline: string | null
  siteName: string | null
  lang: string | null
  method: 'readability' | 'fallback'
}

export interface SerializedSelection {
  text: string
  url: string
  title: string
  lang: string | null
  capturedAt: number
}

export type ExtensionMessage =
  | { type: 'EXTRACT_PAGE' }
  | { type: 'SELECTION_CAPTURED'; selection: SerializedSelection }
  | { type: 'SAVE_SELECTION'; selection: SerializedSelection }
  | { type: 'ASK'; question: string; conversationId?: string | null }
  | { type: 'SAVE_NOTE'; text: string; title?: string }

export type ExtractPageResponse =
  | { ok: true; page: ExtractedPage }
  | { ok: false; error: string }

// Mirrors the backend's IngestRequest / IngestResponse (app/schemas/ingest.py)
export interface IngestPayload {
  source: 'article' | 'selection' | 'note'
  text: string
  url?: string
  title?: string
}

export interface IngestResponse {
  document_id: string
  status: string
}

export type SaveResponse =
  | { ok: true; documentId: string }
  // queued: the request failed but was stored locally for a later retry
  | { ok: false; error: string; queued?: boolean }

// One entry per retrieval citation (POST /api/v1/ask -> retrieval.citations)
export interface AskSource {
  marker: string // "[1]", exactly as it appears in the answer text
  document_id: string
  title: string | null
  url: string | null
  locator: string
  from_ocr: boolean
  cited: boolean // the answer text actually references this marker
}

export interface AskResponse {
  answer: string
  sources: AskSource[]
  grounded: boolean
  conversationId: string | null
}

// Reply to an ASK message. Errors cross the message boundary as plain data.
export type AskMessageResponse =
  | { ok: true; result: AskResponse }
  | { ok: false; error: string; retryable: boolean }
