import { askQuestion } from '../shared/ask-api'
import type { AskResponse } from '../shared/types'
import { renderMarkdown, renderSources } from './markdown'

const form = document.getElementById('ask-form') as HTMLFormElement
const input = document.getElementById('ask-input') as HTMLTextAreaElement
const submit = document.getElementById('ask-submit') as HTMLButtonElement
const status = document.getElementById('ask-status') as HTMLElement
const answerBox = document.getElementById('answer') as HTMLElement

function setStatus(text: string, kind: 'error' | '' = '') {
  status.textContent = text
  status.className = `message ${kind}`
}

export function renderAnswer(result: AskResponse) {
  answerBox.replaceChildren(renderMarkdown(result.answer, result.sources))
  const sources = renderSources(result.sources)
  if (sources) answerBox.append(sources)
  answerBox.hidden = false
}

export function resetAsk() {
  input.value = ''
  answerBox.replaceChildren()
  answerBox.hidden = true
  setStatus('')
}

async function ask() {
  const question = input.value.trim()
  if (!question) {
    setStatus('Type a question first', 'error')
    return
  }

  submit.disabled = true
  answerBox.hidden = true
  setStatus('Thinking…')
  try {
    renderAnswer(await askQuestion(question))
    setStatus('')
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Something went wrong', 'error')
  } finally {
    submit.disabled = false
  }
}

export function initAsk() {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    void ask()
  })

  // Enter sends, Shift+Enter adds a new line
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.requestSubmit()
    }
  })
}
