/**
 * Point d'entrée pour le mode WEB (sans Electron)
 *
 * Ce fichier initialise le polyfill window.axora AVANT de charger
 * l'application React, pour que tous les composants aient accès
 * aux fallbacks gracieux.
 */

// IMPORTANT: Initialiser le polyfill EN PREMIER
import { initWebPolyfill } from '@shared/lib/webPolyfill'
initWebPolyfill()

// Puis charger React normalement
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
