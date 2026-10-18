// Backend address, fixed at build time. Set VITE_API_URL in extension/.env to change it.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Google sign-in is only offered when a client ID was set at build time
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_ENABLED = GOOGLE_CLIENT_ID !== ''

// Optional "Web application" OAuth client. With it, Google shows an account chooser on every
// sign-in; without it the extension falls back to the browser profile's Google account.
export const GOOGLE_WEB_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? ''
