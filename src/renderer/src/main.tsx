import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyAppearance, readCachedAppearance } from './theme/applyAppearance'

applyAppearance(readCachedAppearance(), false)

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
