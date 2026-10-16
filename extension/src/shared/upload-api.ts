import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

// OCR on a large image can take a while
const UPLOAD_TIMEOUT_MS = 120_000

export const ACCEPT =
  'application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.png,.jpg,.jpeg,.webp,.tif,.tiff'

export type UploadResult =
  | { kind: 'pdf'; documentId: string; pageCount: number; needsOcr: boolean; pagesNeedingOcr: number }
  | { kind: 'image'; documentId: string; wordCount: number; lowConfidence: boolean }

export class UploadError extends Error {}

export function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

// Sends a PDF to /ingest/file or an image to /ingest/image (OCR), as multipart
export async function uploadFile(file: File, title?: string, language = 'eng'): Promise<UploadResult> {
  const token = await getAuthToken()
  if (!token) throw new UploadError('Log in first')

  const pdf = isPdf(file)
  const body = new FormData()
  body.append('file', file)
  if (title) body.append('title', title)
  if (!pdf) body.append('language', language)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/ingest/${pdf ? 'file' : 'image'}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // the browser sets the multipart boundary
      body,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new UploadError('The server took too long to process the file')
    }
    throw new UploadError('Could not reach the server')
  }

  if (response.status === 401) throw new UploadError('Your session expired. Log in again.')
  if (response.status === 415) {
    throw new UploadError(
      pdf ? 'This is not a valid PDF' : 'Unsupported image format (use PNG, JPEG, WEBP or TIFF)',
    )
  }
  if (response.status === 422) {
    throw new UploadError(
      pdf
        ? 'The PDF is encrypted or unreadable'
        : 'Could not read text from the image (too little text, or a bad language)',
    )
  }
  if (response.status === 503) {
    throw new UploadError(pdf ? 'File storage is unavailable' : 'OCR or file storage is unavailable')
  }
  if (!response.ok) throw new UploadError(`Upload failed (status ${response.status})`)

  const data = await response.json().catch(() => null)
  const documentId = data?.document_id
  if (typeof documentId !== 'string') throw new UploadError('Unexpected response from the server')

  return pdf
    ? {
        kind: 'pdf',
        documentId,
        pageCount: Number(data.page_count) || 0,
        needsOcr: !!data.needs_ocr,
        pagesNeedingOcr: Number(data.pages_needing_ocr) || 0,
      }
    : {
        kind: 'image',
        documentId,
        wordCount: Number(data.word_count) || 0,
        lowConfidence: !!data.low_confidence,
      }
}
