import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'
import type { AskResponse, AskSource } from './types'

export class AskError extends Error {}

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
    })
  } catch {
    throw new AskError('Could not reach the server')
  }

  if (response.status === 401) throw new AskError('Your session expired. Log in again.')
  if (response.status === 404) throw new AskError('The server does not support asking yet')
  if (response.status === 422) throw new AskError('Enter a valid question')
  if (!response.ok) throw new AskError(`Could not get an answer (status ${response.status})`)

  const data = await response.json()
  if (typeof data?.answer !== 'string') throw new AskError('Unexpected response from the server')
  return { answer: data.answer, sources: parseSources(data.sources) }
}
