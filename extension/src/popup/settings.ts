import { connectGoogle, MIN_PASSWORD_LENGTH, setPassword } from '../shared/auth-api'
import { clearAuthToken, getUserEmail } from '../shared/auth-storage'
import { GOOGLE_ENABLED } from '../shared/config'
import { getQueue } from '../shared/retry-queue'

const logoutButton = document.getElementById('logout') as HTMLButtonElement
const connectButton = document.getElementById('google-connect') as HTMLButtonElement
const passwordForm = document.getElementById('set-password-form') as HTMLFormElement
const passwordInput = document.getElementById('new-password') as HTMLInputElement
const passwordConfirm = document.getElementById('new-password-confirm') as HTMLInputElement
const passwordSubmit = document.getElementById('set-password-submit') as HTMLButtonElement
const passwordDialog = document.getElementById('password-dialog') as HTMLDialogElement
const passwordOpen = document.getElementById('password-open') as HTMLButtonElement
const passwordCancel = document.getElementById('password-cancel') as HTMLButtonElement
const passwordMessage = document.getElementById('password-message') as HTMLElement
const message = document.getElementById('settings-message') as HTMLElement
const authStatus = document.getElementById('auth-status') as HTMLElement
const queueCount = document.getElementById('queue-count') as HTMLElement

function setMessage(text: string, kind: 'success' | 'error' | '' = '') {
  message.textContent = text
  message.className = `message ${kind}`
}

function setPasswordMessage(text: string) {
  passwordMessage.textContent = text
  passwordMessage.className = text ? 'message error' : 'message'
}

function closePasswordDialog() {
  passwordDialog.close()
  passwordInput.value = ''
  passwordConfirm.value = ''
  setPasswordMessage('')
}

export async function refreshSettings() {
  setMessage('')
  if (passwordDialog.open) closePasswordDialog()
  const email = await getUserEmail()
  authStatus.textContent = email ? `Signed in as ${email}` : 'Signed in'
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

  passwordOpen.addEventListener('click', () => {
    setMessage('')
    passwordDialog.showModal()
    passwordInput.focus()
  })
  passwordCancel.addEventListener('click', closePasswordDialog)
  // Esc closes the dialog natively; clear the fields then too
  passwordDialog.addEventListener('close', () => {
    passwordInput.value = ''
    passwordConfirm.value = ''
    setPasswordMessage('')
  })

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (passwordInput.value.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (passwordInput.value !== passwordConfirm.value) {
      setPasswordMessage('Passwords do not match')
      return
    }

    passwordSubmit.disabled = true
    setPasswordMessage('')
    try {
      await setPassword(passwordInput.value)
      closePasswordDialog()
      setMessage('Password set. You can now log in with your email and password.', 'success')
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      passwordSubmit.disabled = false
    }
  })
}
