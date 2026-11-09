import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './core/store'
import { UiProvider } from './ui/ui'
import { EditorSelectionProvider } from './ui/editorSelection'
import '@fontsource-variable/geist'
import '@fontsource-variable/source-serif-4/opsz.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/skin.css'

const root = document.getElementById('root')
if (!root) throw new Error('The app root is missing.')

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <UiProvider>
        <EditorSelectionProvider>
          <App />
        </EditorSelectionProvider>
      </UiProvider>
    </StoreProvider>
  </StrictMode>,
)
