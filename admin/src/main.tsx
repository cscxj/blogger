import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@uiw/react-md-editor/markdown-editor.css'
import './lib/i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
