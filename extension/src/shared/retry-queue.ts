import type { IngestPayload } from './types'

const QUEUE_KEY = 'retryQueue'

export interface QueuedRequest {
  id: string
  payload: IngestPayload
  queuedAt: number
  lastError: string
}

// Read-modify-write on storage isn't atomic, so serialize all writes
let writeLock: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn)
  writeLock = run.catch(() => {})
  return run
}

export async function getQueue(): Promise<QueuedRequest[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  const queue = result[QUEUE_KEY]
  return Array.isArray(queue) ? queue : []
}

export function enqueue(payload: IngestPayload, lastError: string): Promise<QueuedRequest> {
  return withLock(async () => {
    const entry: QueuedRequest = {
      id: crypto.randomUUID(),
      payload,
      queuedAt: Date.now(),
      lastError,
    }
    await chrome.storage.local.set({ [QUEUE_KEY]: [...(await getQueue()), entry] })
    return entry
  })
}

export function removeFromQueue(id: string): Promise<void> {
  return withLock(async () => {
    const queue = await getQueue()
    await chrome.storage.local.set({ [QUEUE_KEY]: queue.filter((q) => q.id !== id) })
  })
}
