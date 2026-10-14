export class AskError extends Error {
  constructor(
    message: string,
    // Trying the same question again might work (outage, timeout), as opposed to needing a fix first
    readonly retryable = false,
  ) {
    super(message)
  }
}
