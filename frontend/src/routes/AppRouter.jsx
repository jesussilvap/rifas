import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "../components/layout/PublicLayout.jsx";
import { AdminLayout } from "../components/layout/AdminLayout.jsx";
import { Home } from "../pages/public/Home.jsx";
import { Rifas } from "../pages/public/Rifas.jsx";
import { DetalleRifa } from "../pages/public/DetalleRifa.jsx";
import { Pago } from "../pages/public/Pago.jsx";

// Code splitting del panel administrativo para mantener ligero el bundle móvil público
const AdminLogin = lazy(() => import("../pages/admin/Login.jsx"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard.jsx"));
const GestionRifas = lazy(() => import("../pages/admin/GestionRifas.jsx"));
const GestionNumeros = lazy(() => import("../pages/admin/GestionNumeros.jsx"));
const Participantes = lazy(() => import("../pages/admin/Participantes.jsx"));
const GestionPagos = lazy(() => import("../pages/admin/GestionPagos.jsx"));
const Sorteos = lazy(() => import("../pages/admin/Sorteos.jsx"));
const Configuracion = lazy(() => import("../pages/admin/Configuracion.jsx"));

function AdminFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4 text-sm text-slate-600">
      Cargando módulo administrativo...
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/rifas" element={<Rifas />} />
            <Route path="/rifas/:slug" element={<DetalleRifa />} />
            <Route path="/pago/:token" element={<Pago />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="rifas" element={<GestionRifas />} />
            <Route path="numeros" element={<GestionNumeros />} />
            <Route path="participantes" element={<Participantes />} />
            <Route path="pagos" element={<GestionPagos />} />
            <Route path="sorteos" element={<Sorteos />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
