import { getAuthToken } from '../shared/auth-storage'
import { API_BASE_URL } from '../shared/config'
import { getQueue } from '../shared/retry-queue'

const authStatus = document.getElementById('auth-status') as HTMLElement
const apiUrl = document.getElementById('api-url') as HTMLElement
const queueCount = document.getElementById('queue-count') as HTMLElement

export async function refreshSettings() {
  apiUrl.textContent = API_BASE_URL
  authStatus.textContent = (await getAuthToken()) ? 'Signed in' : 'Not signed in'
  queueCount.textContent = String((await getQueue()).length)
}
