// frontend/src/App.jsx
// Root router — maps URL paths to the three sub-apps.
//
// /kiosk/*  → KioskApp   (customer-facing, Windows touchscreen, landscape)
// /barber/* → BarberApp  (staff-facing, mobile PWA, portrait, Bahasa Indonesia)
// /admin/*  → AdminApp   (owner/manager, desktop, English)
// /*        → redirect to /kiosk

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { tokens } from './shared/tokens.js'
import KioskApp  from './apps/kiosk/KioskApp.jsx'
import BarberApp from './apps/barber/BarberApp.jsx'
import AdminApp  from './apps/admin/AdminApp.jsx'

// Import mockup from external directory via Vite alias
import BercutKioskMockup from '@mockups/kiosk/BercutKiosk.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
        <Routes>
          <Route path="/kiosk/*"  element={<KioskApp />} />
          <Route path="/barber/*" element={<BarberApp />} />
          <Route path="/admin/*"  element={<AdminApp />} />
          <Route path="/mockup/kiosk" element={<BercutKioskMockup />} />
          <Route path="*"         element={<Navigate to="/kiosk" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
