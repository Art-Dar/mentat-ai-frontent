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

const dropZone = document.getElementById('upload-drop') as HTMLElement
const dropText = document.getElementById('upload-drop-text') as HTMLElement
const DROP_HINT = dropText.textContent ?? ''

function isSupported(file: File) {
  return isPdf(file) || /^image\/(png|jpeg|webp|tiff)$/.test(file.type)
}

export function resetUpload() {
  form.reset()
  languageField.hidden = true
  dropText.textContent = DROP_HINT
  dropZone.classList.remove('over')
  setMessage('')
}

export function initUpload() {
  fileInput.accept = ACCEPT

  // Show the chosen file; OCR language only matters for images
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    languageField.hidden = !file || isPdf(file)
    dropText.textContent = file ? file.name : DROP_HINT
  })

  // Without this the browser would navigate to a file dropped outside the zone
  for (const type of ['dragover', 'drop'] as const) {
    document.addEventListener(type, (e) => e.preventDefault())
  }
  dropZone.addEventListener('dragover', () => dropZone.classList.add('over'))
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'))
  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('over')
    const file = e.dataTransfer?.files[0]
    if (!file) return
    if (!isSupported(file)) {
      return setMessage('Unsupported file. Use a PDF, PNG, JPEG, WEBP or TIFF.', 'error')
    }
    const transfer = new DataTransfer()
    transfer.items.add(file)
    fileInput.files = transfer.files
    fileInput.dispatchEvent(new Event('change'))
    setMessage('')
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
