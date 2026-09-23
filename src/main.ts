import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.scss'

createApp(App).mount('#app')

// Installable PWA. Only in production builds, so the service worker never caches dev-server modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
}
