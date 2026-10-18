import { API_BASE_URL } from './config'

export interface Health {
  api: boolean
  db: boolean
}

const HEALTH_TIMEOUT_MS = 5000

async function ok(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    return response.ok
  } catch {
    return false
  }
}

// Neither endpoint needs a token. The database can only be healthy if the API answers.
export async function checkHealth(): Promise<Health> {
  const [api, db] = await Promise.all([ok('/health'), ok('/health/db')])
  return { api, db: api && db }
}
