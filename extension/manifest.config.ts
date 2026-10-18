import { defineManifest } from '@crxjs/vite-plugin'
import { loadEnv } from 'vite'

export default defineManifest(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID
  // Pinning the key keeps the extension ID stable, which the Google OAuth client is bound to
  const extensionKey = env.VITE_EXTENSION_KEY

  return {
    manifest_version: 3,
    name: 'Mentat',
    version: '0.1.0',
    action: {
      default_popup: 'src/popup/index.html',
    },
    background: {
      service_worker: 'src/background/service-worker.ts',
      type: 'module',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['src/content/index.ts'],
      },
    ],
    permissions: ['storage', 'activeTab', 'contextMenus', 'scripting', 'identity'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [{ resources: ['public/icons/icon32.png'], matches: ['<all_urls>'] }],
    icons: {
      16: 'public/icons/icon16.png',
      32: 'public/icons/icon32.png',
      48: 'public/icons/icon48.png',
      128: 'public/icons/icon128.png',
    },
    ...(extensionKey && { key: extensionKey }),
    ...(googleClientId && {
      oauth2: { client_id: googleClientId, scopes: ['openid', 'email', 'profile'] },
    }),
  }
})
