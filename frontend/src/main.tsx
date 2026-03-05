import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './ThemeContext.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { BlindModeProvider } from './BlindModeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BlindModeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BlindModeProvider>
    </ThemeProvider>
  </StrictMode>,
)
