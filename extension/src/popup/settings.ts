import { clearAuthToken } from '../shared/auth-storage'
import { getQueue } from '../shared/retry-queue'

const logoutButton = document.getElementById('logout') as HTMLButtonElement
const queueCount = document.getElementById('queue-count') as HTMLElement

export async function refreshSettings() {
  queueCount.textContent = String((await getQueue()).length)
}

export function initSettings(onLoggedOut: () => void) {
  logoutButton.addEventListener('click', async () => {
    await clearAuthToken()
    onLoggedOut()
  })
}
