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
  | { type: 'SAVE_PAGE'; page: ExtractedPage }
  | { type: 'ASK'; question: string }

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

// Assumed contract for POST /api/v1/ask
export interface AskSource {
  document_id: string
  title: string | null
  url: string | null
}

export interface AskResponse {
  answer: string
  sources: AskSource[]
}

// Reply to an ASK message. Errors cross the message boundary as plain data.
export type AskMessageResponse =
  | { ok: true; result: AskResponse }
  | { ok: false; error: string; retryable: boolean }
