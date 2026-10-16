import { uploadFile, UploadError } from '../shared/upload-api'

const MENU_IMAGE = 'mentat-save-image'
const MENU_PDF_LINK = 'mentat-save-pdf-link'
const MENU_PDF_PAGE = 'mentat-save-pdf-page'

const PDF_URL_PATTERNS = ['*://*/*.pdf', '*://*/*.pdf?*', '*://*/*.pdf#*', 'file:///*.pdf']
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff']

// Context menus persist across service worker restarts, so they're only (re)built on install
export function registerMediaMenus() {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: MENU_IMAGE, title: 'Save image to Mentat', contexts: ['image'] })
      chrome.contextMenus.create({
        id: MENU_PDF_LINK,
        title: 'Save PDF to Mentat',
        contexts: ['link'],
        targetUrlPatterns: PDF_URL_PATTERNS,
      })
      chrome.contextMenus.create({
        id: MENU_PDF_PAGE,
        title: 'Save this PDF to Mentat',
        contexts: ['page'],
        documentUrlPatterns: PDF_URL_PATTERNS,
      })
    })
  })

  chrome.contextMenus.onClicked.addListener((info) => {
    const url =
      info.menuItemId === MENU_IMAGE
        ? info.srcUrl
        : info.menuItemId === MENU_PDF_LINK
          ? info.linkUrl
          : info.menuItemId === MENU_PDF_PAGE
            ? info.pageUrl
            : undefined
    if (url) void saveFromUrl(url, info.menuItemId === MENU_IMAGE)
  })
}

// There's no popup to report in, so the result shows briefly on the toolbar icon
function flashBadge(text: string, color: string) {
  void chrome.action.setBadgeBackgroundColor({ color })
  void chrome.action.setBadgeText({ text })
  setTimeout(() => void chrome.action.setBadgeText({ text: '' }), 3000)
}

function fileNameFor(url: string, type: string): string {
  let name = ''
  try {
    name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
  } catch {
    // data: and odd URLs have no usable name
  }
  const ext = type === 'application/pdf' ? 'pdf' : (type.split('/')[1] ?? 'bin')
  return name && /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${name || 'file'}.${ext}`
}

async function saveFromUrl(url: string, expectImage: boolean) {
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new UploadError(`Could not download the file (status ${response.status})`)
    const blob = await response.blob()

    const type = blob.type.split(';')[0].trim().toLowerCase()
    if (expectImage ? !IMAGE_TYPES.includes(type) : type !== 'application/pdf') {
      throw new UploadError(
        expectImage ? 'Unsupported image format (use PNG, JPEG, WEBP or TIFF)' : 'This is not a PDF',
      )
    }

    await uploadFile(new File([blob], fileNameFor(url, type), { type }))
    flashBadge('✓', '#16a34a')
  } catch (e) {
    console.error('save media failed', e)
    flashBadge('!', '#dc2626')
  }
}
