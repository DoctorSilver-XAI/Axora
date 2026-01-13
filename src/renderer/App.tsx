import { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'tailwindcss/tailwind.css';
import './variables.css';
import './components.css';
import './App.css';
import Sidecar from './components/Sidecar';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { Pharmacy } from './pages/Pharmacy';
import { PreventionPlan } from './pages/PreventionPlan';
import { CashRegister } from './pages/CashRegister';
import Settings from './pages/Settings';
import Lab from './pages/Lab';
import PhiVisionLab from './pages/PhiVisionLab';
import { DosageCalculator } from './pages/DosageCalculator';
import { PhiVisionProvider } from './services/PhiVisionContext';
import { PhiVisionOverlay } from './components/PhiVision/PhiVisionOverlay';
import { AuthProvider } from './services/AuthContext';
import { AuthGuard } from './components/AuthGuard';

function AppContent() {
  const [mode, setMode] = useState<'compact' | 'hub' | 'hidden' | 'phivision'>('compact');

  useEffect(() => {
    // Initial fetch
    if (window.axora) {
      window.axora.getMode().then(setMode);

      // Listen for changes
      const unsubscribe = window.axora.onModeChanged((newMode) => {
        setMode(newMode);
      });
      return () => {
        unsubscribe();
      };
    }
  }, []);

  if (mode === 'compact') {
    return <Sidecar mode="compact" />;
  }

  if (mode === 'phivision') {
    return (
      <>
        {/* Pass mode to Sidecar so it can position itself correctly in fullscreen */}
        <Sidecar mode="phivision" />
        <PhiVisionOverlay />
      </>
    );
  }

  if (mode === 'hidden') {
    return null;
  }

  // mode === 'hub' - Protected by AuthGuard
  return (
    <AuthGuard>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Pharmacy />} />
          <Route path="/assistant" element={<Home />} />
          <Route path="/ppp" element={<PreventionPlan />} />
          <Route path="/caisse" element={<CashRegister />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/phivision-lab" element={<PhiVisionLab />} />
          <Route path="/dosage" element={<DosageCalculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Pharmacy />} />
        </Route>
      </Routes>
      {/* PhiVision overlay in hub mode (for displaying results after analysis) */}
      <PhiVisionOverlay />
    </AuthGuard>
  );
}

import { SettingsProvider } from './services/SettingsContext';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PhiVisionProvider>
          <Router>
            <AppContent />
          </Router>
        </PhiVisionProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

