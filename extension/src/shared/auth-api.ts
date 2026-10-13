import { getAuthToken, saveAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

export const MIN_PASSWORD_LENGTH = 8

async function storeTokenFrom(response: Response): Promise<void> {
  const data = await response.json()
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Unexpected response from the server')
  }
  await saveAuthToken(data.access_token)
}

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
  await storeTokenFrom(response)
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

async function googleAccessToken(): Promise<string> {
  try {
    const { token } = await chrome.identity.getAuthToken({ interactive: true })
    if (token) return token
  } catch {
    // fall through: the user closed the prompt, or the browser has no Google profile
  }
  throw new Error('Google sign-in was cancelled or failed')
}

// POSTs the Google access token to the backend. Chrome caches tokens and can hand back a
// stale one, so on a 401 the cached token is dropped and one fresh token is tried.
async function postGoogleToken(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await googleAccessToken()

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ access_token: token }),
      })
    } catch {
      throw new Error('Could not reach the server')
    }

    if (response.status !== 401) return response
    await chrome.identity.removeCachedAuthToken({ token })
  }
  throw new Error('Google sign-in was rejected. Try again.')
}

// Signs in (or creates the account) with the user's Google account
export async function loginWithGoogle(): Promise<void> {
  const response = await postGoogleToken('google')

  if (response.status === 409) {
    throw new Error(
      'This email is already registered with a password. Log in with your password, then connect Google in Settings.',
    )
  }
  if (!response.ok) throw new Error(`Google sign-in failed (status ${response.status})`)
  await storeTokenFrom(response)
}

// Links the user's Google account to the account they are already logged in with
export async function connectGoogle(): Promise<void> {
  const token = await getAuthToken()
  if (!token) throw new Error('Log in first')

  const response = await postGoogleToken('google/connect', { Authorization: `Bearer ${token}` })

  if (response.status === 409) throw new Error('This Google account is already connected')
  if (!response.ok) throw new Error(`Connecting Google failed (status ${response.status})`)
}
