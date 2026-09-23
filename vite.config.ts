import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cloudflare } from '@cloudflare/vite-plugin'
import { fileURLToPath, URL } from 'node:url'

// The Cloudflare plugin runs worker/index.ts inside workerd next to the Vue dev server,
// so `npm run dev` serves the SPA and /api/* from one origin, exactly like production.
export default defineConfig({
  plugins: [vue(), cloudflare()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url))
    }
  },
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  server: { host: true, port: 5173, strictPort: true }
})
