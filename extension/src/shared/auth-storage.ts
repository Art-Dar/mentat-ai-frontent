const TOKEN_KEY = 'authToken'

// chrome.storage.local is shared by the popup, background worker and content scripts,
// so this module works from any of them.
export async function saveAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  const token = result[TOKEN_KEY]
  return typeof token === 'string' && token ? token : null
}

export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY)
}
