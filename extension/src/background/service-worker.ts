import * as auth from '../shared/auth-storage'
import * as queue from '../shared/retry-queue'
import { flushRetryQueue, startSyncListeners } from './sync'

console.log('background loaded')

startSyncListeners()

// Debug handles for manual testing from the service worker DevTools console
;(globalThis as any).mentatAuth = auth
;(globalThis as any).mentatQueue = { ...queue, flushRetryQueue }
