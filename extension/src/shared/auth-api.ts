import { getAuthToken, saveAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

async function storeTokenFrom(response: Response): Promise<void> {
  const data = await response.json()
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Unexpected response from the server')
  }
  await saveAuthToken(data.access_token)
}

// Exchanges email + password for a token and stores it. The password is never stored.
export async function login(email: string, password: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('Could not reach the server')
  }

  if (response.status === 401) throw new Error('Invalid email or password')
  if (!response.ok) throw new Error(`Login failed (status ${response.status})`)
  await storeTokenFrom(response)
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
