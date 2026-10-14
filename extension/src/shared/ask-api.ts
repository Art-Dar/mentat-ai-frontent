import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'
import type { AskResponse, AskSource } from './types'

// Answers can take a while (retrieval plus an LLM call), but not forever
export const ASK_TIMEOUT_MS = 60_000

export class AskError extends Error {
  constructor(
    message: string,
    // Trying the same question again might work (outage, timeout), as opposed to needing a fix first
    readonly retryable = false,
  ) {
    super(message)
  }
}

function parseSources(value: unknown): AskSource[] {
  if (!Array.isArray(value)) return []
  return value.map((s) => ({
    document_id: typeof s?.document_id === 'string' ? s.document_id : '',
    title: typeof s?.title === 'string' ? s.title : null,
    url: typeof s?.url === 'string' ? s.url : null,
  }))
}

// Asks the backend a question about the user's saved content.
export async function askQuestion(question: string): Promise<AskResponse> {
  const token = await getAuthToken()
  if (!token) throw new AskError('Log in first')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new AskError('The server took too long to answer', true)
    }
    throw new AskError('Could not reach the server', true)
  }

  if (response.status === 401) throw new AskError('Your session expired. Log in again.')
  if (response.status === 404) throw new AskError('The server does not support asking yet')
  if (response.status === 422) throw new AskError('Enter a valid question')
  if (response.status === 429) {
    throw new AskError('Too many questions at once. Wait a moment and retry.', true)
  }
  if (!response.ok) {
    throw new AskError(`Could not get an answer (status ${response.status})`, response.status >= 500)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new AskError('Unexpected response from the server', true)
  }
  const answer = (data as { answer?: unknown })?.answer
  if (typeof answer !== 'string') throw new AskError('Unexpected response from the server', true)
  return { answer, sources: parseSources((data as { sources?: unknown }).sources) }
}
