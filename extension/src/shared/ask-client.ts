import { AskError } from './ask-error'
import type { AskMessageResponse, AskResponse, ExtensionMessage } from './types'

// The popup never calls the backend itself. The background worker makes the request, which
// keeps the auth token and network access in one place and avoids page-level CORS limits.
export async function askQuestion(
  question: string,
  conversationId: string | null,
): Promise<AskResponse> {
  let reply: AskMessageResponse | undefined
  try {
    reply = await chrome.runtime.sendMessage({
      type: 'ASK',
      question,
      conversationId,
    } satisfies ExtensionMessage)
  } catch {
    // the worker could not be started or was reloaded mid-request
  }

  if (!reply) throw new AskError('Could not reach the extension. Try again.', true)
  if (!reply.ok) throw new AskError(reply.error, reply.retryable)
  return reply.result
}
