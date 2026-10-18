import { FileLinkError, getOriginalFileUrl } from '../shared/files-api'
import type { AskSource } from '../shared/types'

// Renders a small Markdown subset into DOM nodes. It never uses innerHTML, so text from the
// server can't inject markup. Supported: paragraphs, #-headings, -/* and 1. lists, fenced code,
// **bold**, *italic*, `code`, [text](https://link) and [1]-style citations of `sources`.

function isHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

function link(text: string, href: string): HTMLAnchorElement {
  const a = document.createElement('a')
  a.textContent = text
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  return a
}

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\))|(\[(\d+)\])/g

function appendInline(parent: HTMLElement, text: string, sources: AskSource[]) {
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > last) parent.append(text.slice(last, index))
    last = index + match[0].length

    if (match[1]) {
      const code = document.createElement('code')
      code.textContent = match[1].slice(1, -1)
      parent.append(code)
    } else if (match[2]) {
      const strong = document.createElement('strong')
      strong.textContent = match[2].slice(2, -2)
      parent.append(strong)
    } else if (match[3]) {
      const em = document.createElement('em')
      em.textContent = match[3].slice(1, -1)
      parent.append(em)
    } else if (match[4]) {
      parent.append(link(match[5], match[6]))
    } else if (match[7]) {
      const source = sources.find((x) => x.marker === match[7])
      if (!source) {
        parent.append(match[7])
      } else {
        const sup = document.createElement('sup')
        sup.className = 'citation'
        if (isHttpUrl(source.url)) sup.append(link(match[7], source.url))
        else sup.textContent = match[7]
        parent.append(sup)
      }
    }
  }
  if (last < text.length) parent.append(text.slice(last))
}

export function renderMarkdown(markdown: string, sources: AskSource[] = []): DocumentFragment {
  const out = document.createDocumentFragment()
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')

  let paragraph: string[] = []
  let list: HTMLOListElement | HTMLUListElement | null = null
  let listKind: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    const p = document.createElement('p')
    appendInline(p, paragraph.join(' '), sources)
    out.append(p)
    paragraph = []
  }
  const flushList = () => {
    list = null
    listKind = null
  }
  const addItem = (kind: 'ul' | 'ol', text: string) => {
    if (!list || listKind !== kind) {
      list = document.createElement(kind)
      listKind = kind
      out.append(list)
    }
    const li = document.createElement('li')
    appendInline(li, text, sources)
    list.append(li)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trimStart().startsWith('```')) {
      flushParagraph()
      flushList()
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].trimStart().startsWith('```'); i++) code.push(lines[i])
      const pre = document.createElement('pre')
      const codeEl = document.createElement('code')
      codeEl.textContent = code.join('\n')
      pre.append(codeEl)
      out.append(pre)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)

    if (heading) {
      flushParagraph()
      flushList()
      const p = document.createElement('p')
      p.className = 'md-heading'
      appendInline(p, heading[1], sources)
      out.append(p)
    } else if (bullet) {
      flushParagraph()
      addItem('ul', bullet[1])
    } else if (numbered) {
      flushParagraph()
      addItem('ol', numbered[1])
    } else {
      flushList()
      paragraph.push(line.trim())
    }
  }
  flushParagraph()
  return out
}

// Fetches a fresh presigned link on click (they expire) and opens it in a new tab
function originalFileButton(documentId: string): HTMLElement {
  const holder = document.createElement('span')
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'link source-file'
  btn.textContent = 'Original file'
  const note = document.createElement('span')
  note.className = 'source-file-note'
  holder.append(btn, note)

  btn.addEventListener('click', async () => {
    btn.disabled = true
    note.textContent = ''
    try {
      await chrome.tabs.create({ url: await getOriginalFileUrl(documentId) })
    } catch (e) {
      const missing = e instanceof FileLinkError && e.missing
      if (missing) btn.hidden = true
      note.textContent = e instanceof Error ? e.message : 'Something went wrong'
      note.className = `source-file-note${missing ? '' : ' error'}`
    } finally {
      btn.disabled = false
    }
  })
  return holder
}

// Collapsible footnote list. Sources the answer cites come first; the rest are dimmed.
export function renderSources(sources: AskSource[]): HTMLElement | null {
  if (!sources.length) return null

  const details = document.createElement('details')
  details.className = 'sources'
  const summary = document.createElement('summary')
  summary.textContent = `Sources (${sources.length})`
  const ol = document.createElement('ol')
  ol.className = 'sources-list'

  for (const source of [...sources].sort((a, b) => Number(b.cited) - Number(a.cited))) {
    const li = document.createElement('li')
    li.className = source.cited ? '' : 'dim'
    const label = source.title || source.url || 'Untitled'
    li.append(`${source.marker} `)
    if (isHttpUrl(source.url)) li.append(link(label, source.url))
    else li.append(label)
    if (source.locator) li.append(` \u00b7 ${source.locator}`)
    if (source.from_ocr) li.append(' \u00b7 scanned')
    if (source.document_id) li.append(' ', originalFileButton(source.document_id))
    ol.append(li)
  }
  details.append(summary, ol)
  return details
}
