import { saveAuthToken } from './auth-storage'
import { API_BASE_URL } from './config'

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

  const data = await response.json()
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Unexpected response from the server')
  }
  await saveAuthToken(data.access_token)
}
