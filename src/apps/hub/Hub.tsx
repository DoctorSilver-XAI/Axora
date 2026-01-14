import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Nexus } from './pages/Nexus'
import { PhiVisionPage } from './pages/PhiVision'
import { PhiVisionLabPage } from './pages/PhiVisionLab'
import { Assistant } from './pages/Assistant'
import { Messaging } from './pages/Messaging'
import { Settings } from './pages/Settings'
import { Login, Register } from './pages/Auth'
import { ProtectedRoute } from '@shared/components/ProtectedRoute'
import { ModuleLoaderProvider } from '@/modules'

// Import modules to register them
import '@/modules'

export function Hub() {
  return (
    <Routes>
      {/* Auth routes (publiques) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ModuleLoaderProvider>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/nexus" element={<Nexus />} />
                  <Route path="/phivision" element={<PhiVisionPage />} />
                  <Route path="/phivision-lab" element={<PhiVisionLabPage />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/messaging" element={<Messaging />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </MainLayout>
            </ModuleLoaderProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
