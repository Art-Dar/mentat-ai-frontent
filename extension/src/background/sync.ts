import { getQueue, recordFailedAttempt, removeFromQueue, type QueuedSave } from '../shared/retry-queue'

// TODO: replace with the real backend call once the save API exists
async function sendToBackend(item: QueuedSave): Promise<void> {
  console.log('sending queued save', item.kind, item.id)
}

const RETRY_ALARM = 'flush-retry-queue'
const RETRY_INTERVAL_MINUTES = 1

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

// navigator.onLine and the 'online' event are unreliable (they only reflect network adapters),
// so while the queue is non-empty an alarm retries periodically. Alarms also wake a sleeping worker.
async function syncRetryAlarm() {
  if ((await getQueue()).length === 0) {
    await chrome.alarms.clear(RETRY_ALARM)
  } else if (!(await chrome.alarms.get(RETRY_ALARM))) {
    await chrome.alarms.create(RETRY_ALARM, { periodInMinutes: RETRY_INTERVAL_MINUTES })
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

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== RETRY_ALARM) return
    console.log('retry alarm fired, flushing retry queue')
    void flushRetryQueue()
  })
  // Keep the alarm in step with the queue: on while items wait, off when empty
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.retryQueue) void syncRetryAlarm()
  })
  void syncRetryAlarm()
}
