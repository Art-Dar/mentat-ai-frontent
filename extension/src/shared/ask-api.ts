import { AskError } from './ask-error'
import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'
import type { AskResponse, AskSource } from './types'

// Answers can take a while (retrieval plus an LLM call), but not forever
export const ASK_TIMEOUT_MS = 60_000

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

// Joins by marker, not array index: the server may leave gaps in the numbering
export function parseSources(retrieval: unknown, citedMarkers: unknown): AskSource[] {
  const citations = (retrieval as { citations?: unknown })?.citations
  if (!Array.isArray(citations)) return []
  const cited = new Set(Array.isArray(citedMarkers) ? citedMarkers : [])
  return citations.map((c) => ({
    marker: str(c?.marker) ?? '',
    document_id: str(c?.document_id) ?? '',
    title: str(c?.title),
    url: str(c?.url),
    locator: str(c?.locator) ?? '',
    from_ocr: c?.from_ocr === true,
    cited: cited.has(c?.marker),
  }))
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  if (!token) throw new AskError('Log in first')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// A question without a conversation is answered but not stored, so follow-ups need a thread
async function createConversation(headers: Record<string, string>): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: 'POST',
      headers,
      body: '{}',
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
  } catch {
    throw new AskError('Could not reach the server', true)
  }
  if (response.status === 401) throw new AskError('Your session expired. Log in again.')
  if (!response.ok) throw new AskError(`Could not start a chat (status ${response.status})`, response.status >= 500)
  const id = str((await response.json().catch(() => null))?.id)
  if (!id) throw new AskError('Unexpected response from the server', true)
  return id
}

// Asks the backend a question about the user's saved content.
export async function askQuestion(
  question: string,
  conversationId?: string | null,
): Promise<AskResponse> {
  const headers = await authHeaders()
  const threadId = conversationId ?? (await createConversation(headers))

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, conversation_id: threadId }),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new AskError('The server took too long to answer', true)
    }
    throw new AskError('Could not reach the server', true)
  }

  if (response.status === 401) throw new AskError('Your session expired. Log in again.')
  if (response.status === 404) throw new AskError('This chat no longer exists. Start a new one.')
  if (response.status === 503) throw new AskError('The assistant is busy right now. Try again.', true)
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
  const d = data as { retrieval?: unknown; cited_markers?: unknown; grounded?: unknown }
  return {
    answer,
    sources: parseSources(d.retrieval, d.cited_markers),
    grounded: d.grounded !== false,
    conversationId: threadId,
  }
}
