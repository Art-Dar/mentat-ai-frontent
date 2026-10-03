const QUEUE_KEY = 'retryQueue'

export interface QueuedSave {
  id: string
  kind: 'page' | 'selection'
  // Shape depends on kind; opaque to the queue
  payload: unknown
  queuedAt: number
  attempts: number
}

export type NewQueuedSave = Pick<QueuedSave, 'kind' | 'payload'>

// Read-modify-write on storage isn't atomic, so serialize all writes
let writeLock: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn)
  writeLock = run.catch(() => {})
  return run
}

export async function getQueue(): Promise<QueuedSave[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  const queue = result[QUEUE_KEY]
  return Array.isArray(queue) ? queue : []
}

export function enqueue(item: NewQueuedSave): Promise<QueuedSave> {
  return withLock(async () => {
    const entry: QueuedSave = {
      ...item,
      id: crypto.randomUUID(),
      queuedAt: Date.now(),
      attempts: 0,
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

export function recordFailedAttempt(id: string): Promise<void> {
  return withLock(async () => {
    const queue = await getQueue()
    await chrome.storage.local.set({
      [QUEUE_KEY]: queue.map((q) => (q.id === id ? { ...q, attempts: q.attempts + 1 } : q)),
    })
  })
}
