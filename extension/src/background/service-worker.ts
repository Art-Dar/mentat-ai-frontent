import * as auth from '../shared/auth-storage'

console.log('background loaded')

// Debug handle for manual testing from the service worker DevTools console
;(globalThis as any).mentatAuth = auth
