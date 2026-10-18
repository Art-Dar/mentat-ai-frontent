import { askQuestion } from '../shared/ask-client'
import { AskError } from '../shared/ask-error'
import { getAuthToken } from '../shared/auth-storage'
import {
  deleteConversation,
  getConversation,
  listConversations,
  type ConversationSummary,
} from '../shared/conversations-api'
import type { AskResponse } from '../shared/types'
import { renderMarkdown, renderSources } from './markdown'

const listView = document.getElementById('chat-list-view') as HTMLElement
const listEl = document.getElementById('chat-list') as HTMLUListElement
const listStatus = document.getElementById('chat-list-status') as HTMLElement
const newChat = document.getElementById('new-chat') as HTMLButtonElement

const chatView = document.getElementById('chat-view') as HTMLElement
const backButton = document.getElementById('chat-back') as HTMLButtonElement
const chatTitle = document.getElementById('chat-title') as HTMLElement
const log = document.getElementById('chat-log') as HTMLElement
const empty = document.getElementById('chat-empty') as HTMLElement
const form = document.getElementById('ask-form') as HTMLFormElement
const input = document.getElementById('ask-input') as HTMLTextAreaElement
const submit = document.getElementById('ask-submit') as HTMLButtonElement

const UNTITLED = 'New chat'

// The open thread. Null until the first answer of a new chat comes back.
let conversationId: string | null = null
let busy = false
// Bumped on every navigation so a slow response can't land in a chat the user has left
let navToken = 0

function scrollToEnd() {
  log.scrollTop = log.scrollHeight
}

function addMessage(kind: 'user' | 'bot' | 'error'): HTMLElement {
  empty.hidden = true
  const el = document.createElement('div')
  el.className = `msg ${kind}`
  log.append(el)
  return el
}

function addUserMessage(text: string) {
  addMessage('user').textContent = text
  scrollToEnd()
}

function addTyping(): HTMLElement {
  const el = addMessage('bot')
  el.setAttribute('aria-label', 'Thinking')
  el.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>'
  scrollToEnd()
  return el
}

type Answer = Pick<AskResponse, 'answer' | 'sources' | 'grounded'>

export function renderAnswer(result: Answer, target: HTMLElement = addMessage('bot')) {
  target.removeAttribute('aria-label')
  target.classList.toggle('ungrounded', !result.grounded)
  const body = document.createElement('div')
  body.className = 'answer-body'
  body.append(renderMarkdown(result.answer, result.sources))
  target.replaceChildren(body)
  // "I could not find that" cites nothing, so a sources panel would be misleading
  const sources = result.grounded ? renderSources(result.sources) : null
  if (sources) target.append(sources)
  scrollToEnd()
}

function setBusy(on: boolean) {
  busy = on
  submit.disabled = on
  backButton.disabled = on
}

function autoGrow() {
  input.style.height = 'auto'
  input.style.height = `${input.scrollHeight}px`
}

async function send(question: string) {
  const token = navToken
  setBusy(true)
  const pending = addTyping()
  try {
    const result = await askQuestion(question, conversationId)
    if (token !== navToken) return
    conversationId = result.conversationId
    renderAnswer(result, pending)
  } catch (err) {
    if (token !== navToken) return
    const retryable = err instanceof AskError && err.retryable
    // A dead thread (404) can't be continued, so the next question starts a fresh one
    if (err instanceof AskError && !retryable && /no longer exists/.test(err.message)) {
      conversationId = null
    }
    pending.remove()
    showError(question, err instanceof Error ? err.message : 'Something went wrong', retryable)
  } finally {
    if (token === navToken) {
      setBusy(false)
      input.focus()
    }
  }
}

function showError(question: string, message: string, retryable: boolean) {
  const el = addMessage('error')
  const text = document.createElement('span')
  text.textContent = message
  el.append(text)
  if (retryable) {
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'retry'
    retry.textContent = 'Retry'
    retry.addEventListener('click', () => {
      if (busy) return
      el.remove()
      void send(question)
    })
    el.append(retry)
  }
  scrollToEnd()
}

function clearLog() {
  log.replaceChildren(empty)
  empty.hidden = false
}

function showChat(id: string | null, title: string) {
  navToken++
  conversationId = id
  chatTitle.textContent = title
  clearLog()
  setBusy(false)
  listView.hidden = true
  chatView.hidden = false
  input.focus()
}

async function openChat(chat: ConversationSummary) {
  showChat(chat.id, chat.title || UNTITLED)
  const token = navToken
  setBusy(true)
  const loading = addTyping()
  try {
    const detail = await getConversation(chat.id)
    if (token !== navToken) return
    loading.remove()
    for (const m of detail.messages) {
      if (m.role === 'user') addUserMessage(m.content)
      else renderAnswer({ answer: m.content, sources: m.sources, grounded: m.grounded })
    }
    if (!detail.messages.length) empty.hidden = false
    scrollToEnd()
  } catch (err) {
    if (token !== navToken) return
    loading.remove()
    const el = addMessage('error')
    const text = document.createElement('span')
    text.textContent = err instanceof Error ? err.message : 'Could not load this chat'
    el.append(text)
  } finally {
    if (token === navToken) setBusy(false)
  }
}

function renderList(chats: ConversationSummary[]) {
  listStatus.textContent = chats.length ? '' : 'No chats yet. Start one above.'
  listEl.replaceChildren(
    ...chats.map((chat) => {
      const li = document.createElement('li')
      const open = document.createElement('button')
      open.type = 'button'
      open.className = 'chat-open'
      open.textContent = chat.title || UNTITLED
      open.addEventListener('click', () => void openChat(chat))

      const del = document.createElement('button')
      del.type = 'button'
      del.className = 'chat-delete'
      del.textContent = '×'
      del.title = 'Delete chat'
      del.setAttribute('aria-label', `Delete chat ${open.textContent}`)
      del.addEventListener('click', async () => {
        del.disabled = true
        try {
          await deleteConversation(chat.id)
          li.remove()
          if (!listEl.children.length) renderList([])
        } catch (err) {
          del.disabled = false
          listStatus.textContent = err instanceof Error ? err.message : 'Could not delete the chat'
        }
      })
      li.append(open, del)
      return li
    }),
  )
}

export function showChatList() {
  navToken++
  conversationId = null
  chatView.hidden = true
  listView.hidden = false
  void refreshChatList()
}

// Called whenever the Ask tab is shown; leaves an open chat alone
export async function refreshChatList() {
  if (listView.hidden) return
  if (!(await getAuthToken())) return
  listStatus.textContent = 'Loading chats…'
  try {
    renderList(await listConversations())
  } catch (err) {
    listEl.replaceChildren()
    listStatus.textContent = err instanceof Error ? err.message : 'Could not load chats'
  }
}

export function resetAsk() {
  input.value = ''
  autoGrow()
  listEl.replaceChildren()
  listStatus.textContent = ''
  clearLog()
  setBusy(false)
  chatView.hidden = true
  listView.hidden = false
  navToken++
  conversationId = null
}

export function initAsk() {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const question = input.value.trim()
    if (!question || busy) return
    input.value = ''
    autoGrow()
    if (chatTitle.textContent === UNTITLED) {
      chatTitle.textContent = question.length > 40 ? `${question.slice(0, 40)}…` : question
    }
    addUserMessage(question)
    void send(question)
  })

  // Enter sends, Shift+Enter adds a new line
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.requestSubmit()
    }
  })
  input.addEventListener('input', autoGrow)

  // A chat is only created on the server once its first question is sent
  newChat.addEventListener('click', () => showChat(null, UNTITLED))
  backButton.addEventListener('click', () => {
    if (!busy) showChatList()
  })
}
