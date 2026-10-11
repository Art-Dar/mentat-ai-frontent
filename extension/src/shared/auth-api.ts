import { saveAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

export const MIN_PASSWORD_LENGTH = 8

// POSTs credentials to an auth endpoint, stores the returned token and never stores the password.
// statusMessages maps HTTP statuses to a user-facing message.
async function authenticate(
  path: string,
  email: string,
  password: string,
  statusMessages: Record<number, string>,
  fallback: string,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('Could not reach the server')
  }

  if (!response.ok) {
    throw new Error(statusMessages[response.status] ?? `${fallback} (status ${response.status})`)
  }

  const data = await response.json()
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Unexpected response from the server')
  }
  await saveAuthToken(data.access_token)
}

export function login(email: string, password: string): Promise<void> {
  return authenticate(
    'login',
    email,
    password,
    { 401: 'Invalid email or password' },
    'Login failed',
  )
}

// Creates an account and signs in with it
export function register(email: string, password: string): Promise<void> {
  return authenticate(
    'register',
    email,
    password,
    {
      409: 'An account with this email already exists',
      422: `Check your email and use a password of at least ${MIN_PASSWORD_LENGTH} characters`,
    },
    'Sign up failed',
  )
}
