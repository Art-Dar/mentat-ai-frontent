import * as auth from '../shared/auth-storage'
import { initAsk, renderAnswer, resetAsk } from './ask'
import { initDocumentTags, resetDocumentTags } from './doc-tags'
import { initNote, resetNote } from './note'
import { refreshHealth } from './health'
import { initLogin, resetLoginForm } from './login'
import { initRouter, onScreenShown } from './router'
import { initUpload, resetUpload } from './upload'
import { refreshTags, resetTags } from './tag-manager'
import { initSettings, refreshSettings } from './settings'

const loginView = document.getElementById('login-view') as HTMLElement
const appView = document.getElementById('app-view') as HTMLElement

function showApp() {
  loginView.hidden = true
  appView.hidden = false
  initialScreen()
}

function showLogin() {
  appView.hidden = true
  loginView.hidden = false
  resetLoginForm()
  resetNote()
  resetTags()
  resetUpload()
  resetDocumentTags()
  resetAsk() // don't leave one user's answer on screen for the next
}

function initialScreen() {
  // Always start on Ask after signing in
  document.getElementById('tab-ask')?.click()
}

onScreenShown('settings', () => {
  void refreshSettings()
  void refreshHealth()
})
document.getElementById('health-refresh')?.addEventListener('click', () => void refreshHealth())
void refreshHealth()
onScreenShown('tags', () => void refreshTags())
initRouter('ask')
initAsk()
initNote()
initUpload()
initDocumentTags()
initLogin(showApp)
initSettings(showLogin)

// Authorization is required before anything else is usable
auth.getAuthToken().then((token) => (token ? showApp() : showLogin()))

console.log('popup loaded')

// Debug handle for manual testing from the popup DevTools console
;(globalThis as any).mentatAuth = auth
;(globalThis as any).mentatAsk = { renderAnswer }
