import { createRoot } from 'react-dom/client'
import './index.css'
// Global responsive helpers used across several pages (Children, Nannies, Feed...)
import '../styles/children-responsive.css'
import '../styles/filter-responsive.css'
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
