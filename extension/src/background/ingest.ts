import { getAuthToken } from '../shared/auth-storage'
import { API_BASE_URL } from '../shared/config'
import type {
  ExtractedPage,
  IngestPayload,
  IngestResponse,
  SerializedSelection,
} from '../shared/types'

export class IngestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    // Worth queueing for later: the same request may succeed once the problem clears
    readonly retryable = false,
  ) {
    super(message)
  }
}

// Server-side or transient failures. Auth errors and 4xx validation errors need the user
// (or a code change) to fix, so retrying the same request would just fail again.
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429
}

// The backend validates url as HTTP(S); skip things like file:// instead of failing the save
function httpUrl(url: string): string | undefined {
  return /^https?:\/\//.test(url) ? url : undefined
}

export function buildSelectionPayload(selection: SerializedSelection): IngestPayload {
  return {
    source: 'selection',
    text: selection.text,
    title: selection.title || undefined,
    url: httpUrl(selection.url),
  }
}

export function buildPagePayload(page: ExtractedPage): IngestPayload {
  return {
    source: 'article',
    text: page.text,
    title: page.title || undefined,
    url: httpUrl(page.url),
  }
}

export async function sendToIngest(payload: IngestPayload): Promise<IngestResponse> {
  const token = await getAuthToken()
  if (!token) throw new IngestError('Not signed in: no auth token stored')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new IngestError('Network error: could not reach the server', undefined, true)
  }

  if (!response.ok) {
    throw new IngestError(
      `Ingest failed with status ${response.status}`,
      response.status,
      isRetryableStatus(response.status),
    )
  }
  return response.json()
}
