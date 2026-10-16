import { ACCEPT, isPdf, uploadFile, UploadError, type UploadResult } from '../shared/upload-api'
import { showDocumentTags } from './doc-tags'

const form = document.getElementById('upload-form') as HTMLFormElement
const fileInput = document.getElementById('upload-file') as HTMLInputElement
const titleInput = document.getElementById('upload-title') as HTMLInputElement
const languageField = document.getElementById('upload-language-field') as HTMLElement
const languageSelect = document.getElementById('upload-language') as HTMLSelectElement
const submit = document.getElementById('upload-submit') as HTMLButtonElement
const message = document.getElementById('upload-message') as HTMLElement

function setMessage(text: string, kind: 'success' | 'error' | '' = '') {
  message.textContent = text
  message.className = `message ${kind}`
}

function describe(result: UploadResult): string {
  if (result.kind === 'pdf') {
    const pages = `${result.pageCount} page${result.pageCount === 1 ? '' : 's'}`
    return result.needsOcr
      ? `PDF saved ✓ (${pages}, ${result.pagesNeedingOcr} need OCR)`
      : `PDF saved ✓ (${pages})`
  }
  return result.lowConfidence
    ? `Image saved ✓ (${result.wordCount} words, low OCR confidence: check the text)`
    : `Image saved ✓ (${result.wordCount} words)`
}

export function resetUpload() {
  form.reset()
  languageField.hidden = true
  setMessage('')
}

export function initUpload() {
  fileInput.accept = ACCEPT

  // OCR language only matters for images
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    languageField.hidden = !file || isPdf(file)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const file = fileInput.files?.[0]
    if (!file) return setMessage('Choose a PDF or an image first.', 'error')

    submit.disabled = true
    submit.textContent = 'Uploading…'
    setMessage('')
    try {
      const result = await uploadFile(file, titleInput.value.trim() || undefined, languageSelect.value)
      resetUpload()
      setMessage(describe(result), 'success')
      showDocumentTags(result.documentId)
    } catch (err) {
      setMessage(err instanceof UploadError ? err.message : 'Could not upload the file', 'error')
    } finally {
      submit.disabled = false
      submit.textContent = 'Upload'
    }
  })
}
