import { getAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

export interface Tag {
  id: string
  name: string
  count: number
}

export interface RenameResult {
  mergedInto: string | null
  documentsAffected: number
}

// The response shapes aren't pinned down, so parsing accepts either a bare array
// or an object wrapping it ({ tags: [...] }).
function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const tags = (data as { tags?: unknown })?.tags
  return Array.isArray(tags) ? tags : []
}

function parseTag(raw: unknown): Tag | null {
  const t = raw as Record<string, any> | null
  const name = t?.name ?? t?.tag?.name
  const id = t?.id ?? t?.tag?.id
  if (typeof name !== 'string' || id == null) return null
  const count = t?.usage_count ?? t?.count ?? t?.document_count ?? 0
  return { id: String(id), name, count: typeof count === 'number' ? count : 0 }
}

export interface DocumentTag {
  name: string
  assignedBy: 'user' | 'auto' | null
}

function parseDocumentTag(raw: unknown): DocumentTag | null {
  const t = raw as Record<string, any> | null
  const name = t?.name ?? t?.tag?.name
  if (typeof name !== 'string') return null
  return { name, assignedBy: t?.assigned_by === 'user' || t?.assigned_by === 'auto' ? t.assigned_by : null }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  if (!token) throw new Error('Log in first')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new Error('Could not reach the server')
  }
  if (response.status === 401) throw new Error('Your session expired. Log in again.')
  return response
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error('Unexpected response from the server')
  }
}

// All tags with their usage counts, most used first
export async function listTags(): Promise<Tag[]> {
  const response = await request('/tags')
  if (!response.ok) throw new Error(`Could not load tags (status ${response.status})`)
  return asList(await readJson(response))
    .map(parseTag)
    .filter((t): t is Tag => t !== null)
}

// Renames a tag everywhere; if the name is taken, the backend merges into that tag
export async function renameTag(id: string, name: string): Promise<RenameResult> {
  const response = await request(`/tags/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  if (response.status === 404) throw new Error('This tag no longer exists')
  if (response.status === 422) throw new Error('Invalid tag name')
  if (!response.ok) throw new Error(`Could not rename the tag (status ${response.status})`)
  const data = (await readJson(response)) as Record<string, any>
  const merged = data?.merged_into
  return {
    mergedInto: merged == null ? null : String(merged?.name ?? merged),
    documentsAffected: typeof data?.documents_affected === 'number' ? data.documents_affected : 0,
  }
}

export async function getDocumentTags(documentId: string): Promise<DocumentTag[]> {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/tags`)
  if (response.status === 404) throw new Error('Document not found')
  if (!response.ok) throw new Error(`Could not load tags (status ${response.status})`)
  return asList(await readJson(response))
    .map(parseDocumentTag)
    .filter((t): t is DocumentTag => t !== null)
}

export async function addDocumentTags(documentId: string, names: string[]): Promise<DocumentTag[]> {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/tags`, {
    method: 'POST',
    body: JSON.stringify({ names }),
  })
  if (response.status === 404) throw new Error('Document not found')
  if (response.status === 422) throw new Error('Invalid tag name')
  if (!response.ok) throw new Error(`Could not add the tag (status ${response.status})`)
  return asList(await readJson(response))
    .map(parseDocumentTag)
    .filter((t): t is DocumentTag => t !== null)
}

export async function removeDocumentTag(documentId: string, name: string): Promise<void> {
  const response = await request(
    `/documents/${encodeURIComponent(documentId)}/tags?name=${encodeURIComponent(name)}`,
    { method: 'DELETE' },
  )
  if (response.status === 404) return // already gone
  if (!response.ok) throw new Error(`Could not remove the tag (status ${response.status})`)
}
