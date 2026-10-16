import { checkHealth, type Health } from '../shared/health-api'

const dots = document.querySelectorAll<HTMLElement>('.health-dot')
const detail = document.getElementById('health-detail') as HTMLElement

type State = 'checking' | 'ok' | 'degraded' | 'down'

function summarize(health: Health): { state: State; text: string } {
  if (!health.api) return { state: 'down', text: 'Server unreachable' }
  if (!health.db) return { state: 'degraded', text: 'Server is up, database is not responding' }
  return { state: 'ok', text: 'Server and database are healthy' }
}

function show(state: State, text: string) {
  for (const dot of dots) {
    dot.className = `health-dot ${state}`
    dot.title = text
    dot.setAttribute('aria-label', text)
  }
  detail.textContent = text
}

// Safe to call repeatedly; only the latest check updates the UI
let latest = 0

export async function refreshHealth() {
  const run = ++latest
  show('checking', 'Checking server…')
  const result = summarize(await checkHealth())
  if (run === latest) show(result.state, result.text)
}
