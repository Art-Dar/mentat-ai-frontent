import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

// Thrown with `missing` when the document has no stored original (or isn't the user's)
export class FileLinkError extends Error {
  constructor(
    message: string,
    readonly missing = false,
  ) {
    super(message)
  }
}

// Short-lived presigned download link to the original PDF/image
export async function getOriginalFileUrl(documentId: string): Promise<string> {
  const token = await getAuthToken()
  if (!token) throw new FileLinkError('Log in first')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/documents/${encodeURIComponent(documentId)}/file`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new FileLinkError('Could not reach the server')
  }

  if (response.status === 401) throw new FileLinkError('Your session expired. Log in again.')
  if (response.status === 404) throw new FileLinkError('No original file', true)
  if (response.status === 503) throw new FileLinkError('File storage is unavailable')
  if (!response.ok) throw new FileLinkError(`Could not get the file (status ${response.status})`)

  const url = (await response.json().catch(() => null))?.url
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new FileLinkError('Unexpected response from the server')
  }
  return url
}
