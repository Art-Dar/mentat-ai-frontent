import { Readability } from '@mozilla/readability'
import type { ExtractedPage } from '../shared/types'

export function extractPage(doc: Document = document): ExtractedPage {
  // Readability mutates the DOM, so we work only with a clone
  const clone = doc.cloneNode(true) as Document
  const article = new Readability(clone).parse()

  const base = {
    url: doc.location.href,
    lang: doc.documentElement.lang || null,
  }

  if (article?.textContent?.trim()) {
    return {
      ...base,
      title: article.title || doc.title,
      text: article.textContent.trim(),
      excerpt: article.excerpt ?? null,
      byline: article.byline ?? null,
      siteName: article.siteName ?? null,
      lang: article.lang ?? base.lang,
      method: 'readability',
    }
  }

  return {
    ...base,
    title: doc.title,
    text: doc.body?.innerText.trim() ?? '',
    excerpt: null,
    byline: null,
    siteName: null,
    method: 'fallback',
  }
}