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

export type SaveResponse = { ok: true; documentId: string } | { ok: false; error: string }
