import { login } from '../shared/auth-api'

const form = document.getElementById('login-form') as HTMLFormElement
const emailInput = document.getElementById('email') as HTMLInputElement
const passwordInput = document.getElementById('password') as HTMLInputElement
const submitButton = document.getElementById('login-submit') as HTMLButtonElement
const message = document.getElementById('login-message') as HTMLElement

function setMessage(text: string) {
  message.textContent = text
  message.className = text ? 'message error' : 'message'
}

export function resetLoginForm() {
  emailInput.value = ''
  passwordInput.value = ''
  setMessage('')
}

export function initLogin(onLoggedIn: () => void) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()
    if (!email || !passwordInput.value) {
      setMessage('Enter your email and password')
      return
    }

    submitButton.disabled = true
    try {
      await login(email, passwordInput.value)
      resetLoginForm()
      onLoggedIn()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      passwordInput.value = ''
    } finally {
      submitButton.disabled = false
    }
  })
}
