// Backend address, fixed at build time. Set VITE_API_URL in extension/.env to change it.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
