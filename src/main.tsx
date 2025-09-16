import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import CheckoutSuccessHandler from '../components/CheckoutSuccessHandler'
import UpgradeModalProvider from '../components/UpgradeModalProvider'
import { Provider } from 'react-redux'
import { store } from './store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <CheckoutSuccessHandler />
      <App />
      <UpgradeModalProvider />
    </Provider>
  </StrictMode>,
)
