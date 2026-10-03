import * as auth from '../shared/auth-storage'

console.log('popup loaded')

// Debug handle for manual testing from the popup DevTools console
;(globalThis as any).mentatAuth = auth
