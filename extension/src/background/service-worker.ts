import type { ExtensionMessage } from '../shared/types'

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  if (message.type !== 'SELECTION_CAPTURED') return

  // TODO: persist the selection once the save flow exists
  console.log('selection captured', sender.tab?.id, message.selection)
})
