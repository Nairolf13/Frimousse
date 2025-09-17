import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CheckoutSuccessHandler from '../components/CheckoutSuccessHandler'
import UpgradeModalProvider from '../components/UpgradeModalProvider'
import CookieConsent from './components/CookieConsent'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <CheckoutSuccessHandler />
  <CookieConsent />
  <App />
  <UpgradeModalProvider />
  </StrictMode>,
)
