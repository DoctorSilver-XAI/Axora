import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Hub } from './Hub'
import { AuthProvider } from '@shared/contexts/AuthContext'
import { PhiVisionProvider } from '@shared/contexts/PhiVisionContext'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <PhiVisionProvider>
          <Hub />
        </PhiVisionProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
