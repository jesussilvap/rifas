import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { adminService } from "../../services/api.js";
import { MobileDrawer } from "./MobileDrawer.jsx";

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/rifas", label: "Rifas", icon: Ticket },
  { to: "/admin/numeros", label: "Números", icon: ClipboardList },
  { to: "/admin/participantes", label: "Participantes", icon: Users },
  { to: "/admin/sorteos", label: "Sorteos", icon: Trophy },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    adminService
      .me()
      .then((res) => {
        if (active) setUsuario(res.data.usuario);
      })
      .catch(() => {
        if (active) navigate("/admin/login", { replace: true });
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminService.logout();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4 text-slate-600">
        Verificando sesión administrativa...
      </div>
    );
  }

  const renderLinks = (onNavigate) => (
    <ul className="flex flex-col gap-1">
      {ADMIN_LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-dvh bg-slate-100 text-slate-900">
      {/* Sidebar fijo en escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-100 lg:flex">
        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-base font-bold text-white">DevSoluciones Admin</p>
          {usuario ? (
            <p className="mt-1 truncate text-xs text-slate-400">
              {usuario.nombre} · {usuario.rol}
            </p>
          ) : null}
        </div>
        <nav aria-label="Menú administrativo" className="flex-1 p-3">
          {renderLinks()}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-rose-300 hover:bg-slate-800 hover:text-rose-200"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera móvil del panel */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => drawerRef.current?.open()}
            aria-label="Abrir menú administrativo"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-drawer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">Panel Administrativo</p>
            {usuario ? (
              <p className="truncate text-xs text-slate-500">
                {usuario.nombre} ({usuario.rol})
              </p>
            ) : null}
          </div>
        </header>

        <MobileDrawer
          drawerRef={drawerRef}
          id="admin-mobile-drawer"
          label="Menú administrativo"
          title="DevSoluciones Admin"
          onOpenChange={setMenuOpen}
          footer={
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-rose-300 hover:bg-slate-800"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Cerrar sesión
            </button>
          }
        >
          <nav aria-label="Menú administrativo móvil">
            {renderLinks(() => drawerRef.current?.close())}
          </nav>
        </MobileDrawer>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet context={{ usuario }} />
        </main>
      </div>
    </div>
  );
}
