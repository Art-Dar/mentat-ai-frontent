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
      const source = sources[Number(match[8]) - 1]
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

export function renderSources(sources: AskSource[]): HTMLElement | null {
  if (!sources.length) return null

  const wrapper = document.createElement('div')
  wrapper.className = 'sources'
  const heading = document.createElement('p')
  heading.className = 'sources-title'
  heading.textContent = 'Sources'
  const ol = document.createElement('ol')

  for (const source of sources) {
    const li = document.createElement('li')
    const label = source.title || source.url || 'Untitled'
    if (isHttpUrl(source.url)) li.append(link(label, source.url))
    else li.textContent = label
    ol.append(li)
  }
  wrapper.append(heading, ol)
  return wrapper
}
