import { parseSources } from './ask-api'
import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'
import type { AskSource } from './types'

export class ConversationError extends Error {}

export interface ConversationSummary {
  id: string
  title: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources: AskSource[]
  grounded: boolean
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  if (!token) throw new ConversationError('Log in first')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/conversations${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new ConversationError('Could not reach the server')
  }
  if (response.status === 401) throw new ConversationError('Your session expired. Log in again.')
  if (response.status === 404) throw new ConversationError('This chat no longer exists')
  if (!response.ok) throw new ConversationError(`Request failed (status ${response.status})`)
  return response
}

function summary(c: unknown): ConversationSummary {
  const o = c as { id?: unknown; title?: unknown }
  return { id: String(o?.id ?? ''), title: typeof o?.title === 'string' ? o.title : null }
}

// Most recent first
export async function listConversations(): Promise<ConversationSummary[]> {
  const data = await (await call('?limit=50')).json().catch(() => null)
  const items = Array.isArray(data) ? data : data?.items ?? data?.conversations
  if (!Array.isArray(items)) throw new ConversationError('Unexpected response from the server')
  return items.map(summary).filter((c) => c.id)
}

// Assistant turns carry the retrieval snapshot taken when that answer was written
export async function getConversation(id: string): Promise<ConversationDetail> {
  const data = await (await call(`/${encodeURIComponent(id)}`)).json().catch(() => null)
  if (!data || !Array.isArray(data.messages)) {
    throw new ConversationError('Unexpected response from the server')
  }
  const messages: ChatMessage[] = data.messages.map(
    (m: { role?: string; content?: unknown; retrieval?: unknown; cited_markers?: unknown }) => {
      const sources = parseSources(m.retrieval, m.cited_markers)
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : '',
        sources,
        grounded: Array.isArray(m.cited_markers) && m.cited_markers.length > 0,
      }
    },
  )
  return { ...summary(data), messages }
}

// Deleting a thread never deletes documents
export async function deleteConversation(id: string): Promise<void> {
  await call(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
