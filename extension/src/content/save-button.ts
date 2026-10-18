const HOST_ID = 'mentat-save-button-host'

let host: HTMLElement | null = null
let button: HTMLButtonElement | null = null
let label: HTMLSpanElement | null = null
let clickHandler: (() => void) | null = null

function ensureButton(): HTMLButtonElement {
  if (button && host?.isConnected) return button

  host = document.createElement('div')
  host.id = HOST_ID
  // Shadow DOM keeps page styles from leaking into the button and vice versa
  const root = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    button {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      padding: 6px 10px;
      border-radius: 6px;
      background: #dba67c;
      color: #4a3a2c;
      display: flex;
      align-items: center;
      white-space: nowrap;
      gap: 6px;
      font: 500 13px/1 system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(90, 70, 50, 0.22);
      cursor: pointer;
    }
    img { width: 16px; height: 16px; display: block; }
    button:hover { background: #cf9569; }
    button[disabled] { background: #9cc49b; cursor: default; }
    button.failed[disabled] { background: #d98a7e; }
    button.queued[disabled] { background: #e0c07a; }
  `

  button = document.createElement('button')
  button.type = 'button'
  // The Mentat brain icon, loaded from the extension (listed in web_accessible_resources)
  const icon = document.createElement('img')
  icon.src = chrome.runtime.getURL('public/icons/icon32.png')
  icon.alt = ''
  label = document.createElement('span')
  label.textContent = 'Save'
  button.append(icon, label)
  // Keep the page selection alive: mousedown on a button would otherwise clear it
  button.addEventListener('mousedown', (e) => e.preventDefault())
  button.addEventListener('click', () => clickHandler?.())

  root.append(style, button)
  document.documentElement.appendChild(host)
  return button
}

export function showSaveButton(rect: DOMRect, onClick: () => void) {
  const btn = ensureButton()
  clickHandler = onClick
  resetButton(btn)
  btn.style.display = 'flex'

  // Place below the selection, clamped to the viewport
  const top = Math.min(rect.bottom + 8, window.innerHeight - 40)
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 120)
  btn.style.top = `${Math.max(top, 8)}px`
  btn.style.left = `${left}px`
}

function setLabel(text: string) {
  if (label) label.textContent = text
}

function resetButton(btn: HTMLButtonElement) {
  btn.disabled = false
  btn.classList.remove('failed', 'queued')
  setLabel('Save')
}

export function markSaved() {
  if (!button) return
  button.disabled = true
  setLabel('Saved ✓')
  setTimeout(hideSaveButton, 1200)
}

// Shows the error briefly, then goes back to "Save" so the user can retry
export function markFailed() {
  if (!button) return
  const btn = button
  btn.disabled = true
  btn.classList.add('failed')
  setLabel('Not saved')
  setTimeout(() => resetButton(btn), 2000)
}

// The save failed but is stored locally and will be retried
export function markQueued() {
  if (!button) return
  const btn = button
  btn.disabled = true
  btn.classList.add('queued')
  setLabel('Queued')
  setTimeout(() => resetButton(btn), 2000)
}

export function hideSaveButton() {
  if (button) button.style.display = 'none'
  clickHandler = null
}

export function isSaveButtonEvent(e: Event): boolean {
  return host !== null && e.composedPath().includes(host)
}
