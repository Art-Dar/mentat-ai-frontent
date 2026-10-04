import { getAuthToken } from '../shared/auth-storage'
import { API_BASE_URL } from '../shared/config'
import type { IngestPayload, IngestResponse, SerializedSelection } from '../shared/types'

export class IngestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export function buildSelectionPayload(selection: SerializedSelection): IngestPayload {
  return {
    source: 'selection',
    text: selection.text,
    title: selection.title || undefined,
    // The backend validates url as HTTP(S); skip things like file:// instead of failing the save
    url: /^https?:\/\//.test(selection.url) ? selection.url : undefined,
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
    throw new IngestError('Network error: could not reach the server')
  }

  if (!response.ok) {
    throw new IngestError(`Ingest failed with status ${response.status}`, response.status)
  }
  return response.json()
}
