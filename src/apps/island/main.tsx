import React from 'react'
import ReactDOM from 'react-dom/client'
import { Island } from './Island'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import './island.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary section="Dynamic Island">
      <Island />
    </ErrorBoundary>
  </React.StrictMode>
)
