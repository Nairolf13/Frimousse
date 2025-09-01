import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CheckoutSuccessHandler from '../components/CheckoutSuccessHandler'
import UpgradeModalProvider from '../components/UpgradeModalProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <CheckoutSuccessHandler />
  <App />
  <UpgradeModalProvider />
  </StrictMode>,
)
