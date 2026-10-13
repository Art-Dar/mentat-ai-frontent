import { connectGoogle, MIN_PASSWORD_LENGTH, setPassword } from '../shared/auth-api'
import { clearAuthToken } from '../shared/auth-storage'
import { GOOGLE_ENABLED } from '../shared/config'
import { getQueue } from '../shared/retry-queue'

const logoutButton = document.getElementById('logout') as HTMLButtonElement
const connectButton = document.getElementById('google-connect') as HTMLButtonElement
const passwordForm = document.getElementById('set-password-form') as HTMLFormElement
const passwordInput = document.getElementById('new-password') as HTMLInputElement
const passwordConfirm = document.getElementById('new-password-confirm') as HTMLInputElement
const passwordSubmit = document.getElementById('set-password-submit') as HTMLButtonElement
const message = document.getElementById('settings-message') as HTMLElement
const queueCount = document.getElementById('queue-count') as HTMLElement

function setMessage(text: string, kind: 'success' | 'error' | '' = '') {
  message.textContent = text
  message.className = `message ${kind}`
}

export async function refreshSettings() {
  setMessage('')
  passwordInput.value = ''
  passwordConfirm.value = ''
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

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (passwordInput.value.length < MIN_PASSWORD_LENGTH) {
      setMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 'error')
      return
    }
    if (passwordInput.value !== passwordConfirm.value) {
      setMessage('Passwords do not match', 'error')
      return
    }

    passwordSubmit.disabled = true
    setMessage('')
    try {
      await setPassword(passwordInput.value)
      passwordInput.value = ''
      passwordConfirm.value = ''
      setMessage('Password set. You can now log in with your email and password.', 'success')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong', 'error')
    } finally {
      passwordSubmit.disabled = false
    }
  })
}
