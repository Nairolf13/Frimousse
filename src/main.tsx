import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CheckoutSuccessHandler from '../components/CheckoutSuccessHandler'
import UpgradeModalProvider from '../components/UpgradeModalProvider'
import CookieConsent from './components/CookieConsent'
import { I18nProvider } from './lib/i18n'
import NotificationsProvider from './context/NotificationsProvider'

createRoot(document.getElementById('root')!).render(
  <>
    <CheckoutSuccessHandler />
    <CookieConsent />
    <I18nProvider>
      <NotificationsProvider>
        <App />
        <UpgradeModalProvider />
      </NotificationsProvider>
    </I18nProvider>
  </>
  
)

// Service Worker registration and update handling: when a new SW is installed
// request it to skipWaiting and then reload the page when it takes control.
if ('serviceWorker' in navigator) {
  let refreshing = false
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // When a new SW is found (updatefound), ask it to skip waiting once installed
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // If there's an active controller, the new SW is an update.
            if (navigator.serviceWorker.controller) {
              try {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              } catch (ex) {
                // some browsers may not expose postMessage on the installing worker
                // log at debug level so it doesn't clutter production logs
                console.debug(ex)
              }
            }
          }
        })
      })
    } catch (err) {
      // Register failed
      // Keep silent in production but log for debugging
      console.error('ServiceWorker registration failed:', err)
    }
  })

  // When the controlling service worker changes, reload the page to load fresh assets
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  // Also listen for explicit messages from the SW asking the page to reload
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data || {}
    if (data.type === 'RELOAD_FOR_UPDATE') {
      if (refreshing) return
      refreshing = true
      // Optionally we could inspect data.version here before reloading
      window.location.reload()
    }
  })
}
