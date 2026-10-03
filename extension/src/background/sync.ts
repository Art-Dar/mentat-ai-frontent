import { getQueue, recordFailedAttempt, removeFromQueue, type QueuedSave } from '../shared/retry-queue'

// TODO: replace with the real backend call once the save API exists
async function sendToBackend(item: QueuedSave): Promise<void> {
  console.log('sending queued save', item.kind, item.id)
}

let flushing = false

// Sends queued saves oldest-first. Stops at the first failure so order is kept
// and we don't hammer a backend that is still unreachable.
export async function flushRetryQueue(send: (item: QueuedSave) => Promise<void> = sendToBackend) {
  if (flushing) return
  flushing = true
  try {
    for (const item of await getQueue()) {
      try {
        await send(item)
      } catch (e) {
        console.warn('queue flush stopped, will retry later', e)
        await recordFailedAttempt(item.id)
        return
      }
      await removeFromQueue(item.id)
    }
  } finally {
    flushing = false
  }
}

export function startSyncListeners() {
  // Fires while the worker is alive when connectivity returns
  self.addEventListener('online', () => {
    console.log('back online, flushing retry queue')
    void flushRetryQueue()
  })

  // The worker may have been asleep when the network returned, so also flush on startup
  chrome.runtime.onStartup.addListener(() => void flushRetryQueue())
  if (navigator.onLine) void flushRetryQueue()
}
