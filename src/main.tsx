import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings } from 'luxon'
import './index.css'
import App from './App'

Settings.defaultLocale = 'fr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
