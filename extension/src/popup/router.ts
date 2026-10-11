export type Screen = 'ask' | 'settings'

const tabs = document.querySelectorAll<HTMLButtonElement>('.tab')
const screens = document.querySelectorAll<HTMLElement>('.screen')

const listeners: Partial<Record<Screen, () => void>> = {}

// Runs every time the screen is shown, so it can refresh its data
export function onScreenShown(screen: Screen, listener: () => void) {
  listeners[screen] = listener
}

export function showScreen(screen: Screen) {
  for (const tab of tabs) {
    const active = tab.dataset.screen === screen
    tab.setAttribute('aria-selected', String(active))
  }
  for (const el of screens) el.hidden = el.id !== `screen-${screen}`
  listeners[screen]?.()
}

export function initRouter(initial: Screen) {
  for (const tab of tabs) {
    tab.addEventListener('click', () => showScreen(tab.dataset.screen as Screen))
  }
  showScreen(initial)
}
