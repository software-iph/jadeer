import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LangProvider } from './i18n'
import { ContentProvider } from './content-context'
import App from './App'
import './styles/global.css'
import './styles/updates.css'
import './styles/pages.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <ContentProvider>
          <App />
        </ContentProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
)
