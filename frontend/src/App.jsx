import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { tokens } from './shared/tokens.js'
import KioskApp  from './apps/kiosk/KioskApp.jsx'
import BarberApp from './apps/barber/BarberApp.jsx'
import AdminApp  from './apps/admin/AdminApp.jsx'

// Mockups — only loaded in development to keep production bundle clean
const BercutKioskMockup = !import.meta.env.PROD 
  ? lazy(() => import('@mockups/kiosk/BercutKiosk.jsx'))
  : null
const BercutAdminMockup = !import.meta.env.PROD 
  ? lazy(() => import('@mockups/admin/BercutAdmin.jsx'))
  : null

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/kiosk/*"       element={<KioskApp />} />
            <Route path="/barber/*"      element={<BarberApp />} />
            <Route path="/admin/*"       element={<AdminApp />} />
            
            {!import.meta.env.PROD && (
              <>
                <Route path="/mockup/kiosk"  element={<BercutKioskMockup />} />
                <Route path="/mockup/admin"  element={<BercutAdminMockup />} />
              </>
            )}

            <Route path="*"              element={<Navigate to="/kiosk" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}
