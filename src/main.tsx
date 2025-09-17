import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CheckoutSuccessHandler from '../components/CheckoutSuccessHandler'
import UpgradeModalProvider from '../components/UpgradeModalProvider'
import CookieConsent from './components/CookieConsent'
import { I18nProvider } from './lib/i18n'
import NotificationsProvider from './context/NotificationsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CheckoutSuccessHandler />
    <CookieConsent />
    <I18nProvider>
      <NotificationsProvider>
        <App />
        <UpgradeModalProvider />
      </NotificationsProvider>
    </I18nProvider>
  </StrictMode>,
)
