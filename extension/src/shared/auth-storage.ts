const TOKEN_KEY = 'authToken'
const EMAIL_KEY = 'userEmail'

// chrome.storage.local is shared by the popup, background worker and content scripts,
// so this module works from any of them.
// `email` is remembered for display when the sign-in method knows it; otherwise any
// email left from a previous session is dropped so it can't be shown for the wrong user.
export async function saveAuthToken(token: string, email?: string): Promise<void> {
  if (email) await chrome.storage.local.set({ [TOKEN_KEY]: token, [EMAIL_KEY]: email })
  else {
    await chrome.storage.local.set({ [TOKEN_KEY]: token })
    await chrome.storage.local.remove(EMAIL_KEY)
  }
}

function emailFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload))
    const email = claims?.email ?? claims?.sub
    return typeof email === 'string' && email.includes('@') ? email : null
  } catch {
    return null
  }
}

// The signed-in user's email, if the app knows it (stored at login, else read from the token)
export async function getUserEmail(): Promise<string | null> {
  const result = await chrome.storage.local.get(EMAIL_KEY)
  const stored = result[EMAIL_KEY]
  if (typeof stored === 'string' && stored) return stored
  const token = await getAuthToken()
  return token ? emailFromToken(token) : null
}

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  const token = result[TOKEN_KEY]
  return typeof token === 'string' && token ? token : null
}

export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, EMAIL_KEY])
}
