import * as auth from '../shared/auth-storage'
import { initRouter, onScreenShown } from './router'
import { initSaveButton } from './save'
import { refreshSettings } from './settings'

onScreenShown('settings', () => void refreshSettings())
initRouter('ask')
initSaveButton()

console.log('popup loaded')

// Debug handle for manual testing from the popup DevTools console
;(globalThis as any).mentatAuth = auth
