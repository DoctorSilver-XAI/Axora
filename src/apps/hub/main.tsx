import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Hub } from './Hub'
import { AuthProvider } from '@shared/contexts/AuthContext'
import { PhiVisionProvider } from '@shared/contexts/PhiVisionContext'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary section="Axora">
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <PhiVisionProvider>
            <Hub />
          </PhiVisionProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
