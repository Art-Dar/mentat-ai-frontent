const HOST_ID = 'mentat-save-button-host'

let host: HTMLElement | null = null
let button: HTMLButtonElement | null = null
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
      background: #4f46e5;
      color: #fff;
      font: 600 13px/1 system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }
    button:hover { background: #4338ca; }
    button[disabled] { background: #16a34a; cursor: default; }
    button.failed[disabled] { background: #dc2626; }
  `

  button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Save to brain'
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
  btn.style.display = 'block'

  // Place below the selection, clamped to the viewport
  const top = Math.min(rect.bottom + 8, window.innerHeight - 40)
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 120)
  btn.style.top = `${Math.max(top, 8)}px`
  btn.style.left = `${left}px`
}

function resetButton(btn: HTMLButtonElement) {
  btn.disabled = false
  btn.classList.remove('failed')
  btn.textContent = 'Save to brain'
}

export function markSaved() {
  if (!button) return
  button.disabled = true
  button.textContent = 'Saved ✓'
  setTimeout(hideSaveButton, 1200)
}

// Shows the error briefly, then goes back to "Save to brain" so the user can retry
export function markFailed() {
  if (!button) return
  const btn = button
  btn.disabled = true
  btn.classList.add('failed')
  btn.textContent = 'Not saved ✕'
  setTimeout(() => resetButton(btn), 2000)
}

export function hideSaveButton() {
  if (button) button.style.display = 'none'
  clickHandler = null
}

export function isSaveButtonEvent(e: Event): boolean {
  return host !== null && e.composedPath().includes(host)
}
