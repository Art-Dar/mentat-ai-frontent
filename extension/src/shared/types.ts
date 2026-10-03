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

export type SaveResponse = { ok: true } | { ok: false; error: string }
