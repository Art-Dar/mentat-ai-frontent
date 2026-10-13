import { connectGoogle } from '../shared/auth-api'
import { clearAuthToken } from '../shared/auth-storage'
import { GOOGLE_ENABLED } from '../shared/config'
import { getQueue } from '../shared/retry-queue'

const logoutButton = document.getElementById('logout') as HTMLButtonElement
const connectButton = document.getElementById('google-connect') as HTMLButtonElement
const message = document.getElementById('settings-message') as HTMLElement
const queueCount = document.getElementById('queue-count') as HTMLElement

function setMessage(text: string, kind: 'success' | 'error' | '' = '') {
  message.textContent = text
  message.className = `message ${kind}`
}

export async function refreshSettings() {
  setMessage('')
  queueCount.textContent = String((await getQueue()).length)
}

export function initSettings(onLoggedOut: () => void) {
  logoutButton.addEventListener('click', async () => {
    await clearAuthToken()
    onLoggedOut()
  })

  connectButton.hidden = !GOOGLE_ENABLED
  connectButton.addEventListener('click', async () => {
    connectButton.disabled = true
    setMessage('')
    try {
      await connectGoogle()
      setMessage('Google account connected ✓', 'success')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong', 'error')
    } finally {
      connectButton.disabled = false
    }
  })
}
