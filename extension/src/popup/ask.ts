import { askQuestion } from '../shared/ask-client'
import { AskError } from '../shared/ask-error'
import type { AskResponse } from '../shared/types'
import { renderMarkdown, renderSources } from './markdown'

const form = document.getElementById('ask-form') as HTMLFormElement
const input = document.getElementById('ask-input') as HTMLTextAreaElement
const submit = document.getElementById('ask-submit') as HTMLButtonElement
const hint = document.getElementById('ask-hint') as HTMLElement
const loading = document.getElementById('ask-loading') as HTMLElement
const errorBox = document.getElementById('ask-error') as HTMLElement
const errorText = document.getElementById('ask-error-text') as HTMLElement
const retryButton = document.getElementById('ask-retry') as HTMLButtonElement
const answerBox = document.getElementById('answer') as HTMLElement

// The popup is in exactly one of these at a time: idle, loading, answered or failed
function setLoading(on: boolean) {
  loading.hidden = !on
  input.disabled = on
  submit.disabled = on
  submit.textContent = on ? 'Asking…' : 'Ask'
}

function showError(message: string, retryable: boolean) {
  errorText.textContent = message
  retryButton.hidden = !retryable
  errorBox.hidden = false
}

function clearFeedback() {
  hint.textContent = ''
  errorBox.hidden = true
  answerBox.hidden = true
}

export function renderAnswer(result: AskResponse) {
  clearFeedback()
  answerBox.replaceChildren(renderMarkdown(result.answer, result.sources))
  const sources = renderSources(result.sources)
  if (sources) answerBox.append(sources)
  answerBox.hidden = false
}

export function resetAsk() {
  input.value = ''
  answerBox.replaceChildren()
  clearFeedback()
  setLoading(false)
}

async function ask() {
  const question = input.value.trim()
  if (!question) {
    clearFeedback()
    hint.textContent = 'Type a question first'
    return
  }

  clearFeedback()
  setLoading(true)
  try {
    renderAnswer(await askQuestion(question))
  } catch (err) {
    const retryable = err instanceof AskError && err.retryable
    showError(err instanceof Error ? err.message : 'Something went wrong', retryable)
  } finally {
    setLoading(false)
    // Disabling the field dropped focus; put the cursor back so the user can keep typing
    input.focus()
  }
}

export function initAsk() {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    void ask()
  })
  retryButton.addEventListener('click', () => void ask())

  // Enter sends, Shift+Enter adds a new line
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.requestSubmit()
    }
  })
}
