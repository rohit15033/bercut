import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/global.css";
import KioskApp from "./apps/kiosk/KioskApp";
import BarberApp from "./apps/barber/BarberApp";
import AdminApp  from "./apps/admin/AdminApp";
import KioskMockup from "./apps/kiosk/Mockup";


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/kiosk" replace />} />
          <Route path="/kiosk/*" element={<KioskApp />} />
          <Route path="/barber/*" element={<BarberApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/kiosk-mockup" element={<KioskMockup />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
