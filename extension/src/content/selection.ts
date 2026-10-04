import type { SerializedSelection } from '../shared/types'

export function serializeSelection(doc: Document = document): SerializedSelection | null {
  const selection = doc.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null

  const text = selection.toString().trim()
  if (!text) return null

  return {
    text,
    url: doc.location.href,
    title: doc.title,
    lang: doc.documentElement.lang || null,
    capturedAt: Date.now(),
  }
}
