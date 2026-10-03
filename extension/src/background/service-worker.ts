import type { ExtensionMessage } from '../shared/types'

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'SELECTION_CAPTURED') {
    console.log('selection captured', sender.tab?.id, message.selection)
    return
  }

  if (message.type === 'SAVE_SELECTION') {
    // TODO: persist the selection once the backend save flow exists
    console.log('save requested', sender.tab?.id, message.selection)
    sendResponse({ ok: true })
  }
})
