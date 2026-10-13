import { login, loginWithGoogle, MIN_PASSWORD_LENGTH, register } from '../shared/auth-api'
import { GOOGLE_ENABLED } from '../shared/config'

const form = document.getElementById('login-form') as HTMLFormElement
const hint = document.getElementById('login-hint') as HTMLElement
const emailInput = document.getElementById('email') as HTMLInputElement
const passwordInput = document.getElementById('password') as HTMLInputElement
const confirmField = document.getElementById('confirm-field') as HTMLElement
const confirmInput = document.getElementById('confirm-password') as HTMLInputElement
const submitButton = document.getElementById('login-submit') as HTMLButtonElement
const toggleButton = document.getElementById('toggle-mode') as HTMLButtonElement
const googleButton = document.getElementById('google-login') as HTMLButtonElement
const message = document.getElementById('login-message') as HTMLElement

let signUp = false

function setMessage(text: string) {
  message.textContent = text
  message.className = text ? 'message error' : 'message'
}

function setMode(next: boolean) {
  signUp = next
  confirmField.hidden = !signUp
  hint.textContent = signUp
    ? 'Create an account to start saving to your brain.'
    : 'Log in to start saving to your brain.'
  submitButton.textContent = signUp ? 'Create account' : 'Log in'
  toggleButton.textContent = signUp ? 'Back to log in' : 'Create an account'
  passwordInput.autocomplete = signUp ? 'new-password' : 'current-password'
  passwordInput.value = ''
  confirmInput.value = ''
  setMessage('')
}

export function resetLoginForm() {
  emailInput.value = ''
  setMode(false)
}

// Returns an error message, or null if the input is fine
function validate(email: string): string | null {
  if (!email || !passwordInput.value) return 'Enter your email and password'
  if (!signUp) return null
  if (passwordInput.value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (passwordInput.value !== confirmInput.value) return 'Passwords do not match'
  return null
}

export function initLogin(onLoggedIn: () => void) {
  toggleButton.addEventListener('click', () => setMode(!signUp))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()
    const problem = validate(email)
    if (problem) {
      setMessage(problem)
      return
    }

    submitButton.disabled = true
    try {
      await (signUp ? register : login)(email, passwordInput.value)
      resetLoginForm()
      onLoggedIn()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      passwordInput.value = ''
      confirmInput.value = ''
    } finally {
      submitButton.disabled = false
    }
  })

  googleButton.hidden = !GOOGLE_ENABLED
  googleButton.addEventListener('click', async () => {
    googleButton.disabled = true
    setMessage('')
    try {
      await loginWithGoogle()
      resetLoginForm()
      onLoggedIn()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      googleButton.disabled = false
    }
  })
}
