import { useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, ShieldCheck, Ticket } from "lucide-react";
import { MobileDrawer } from "./MobileDrawer.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/rifas", label: "Rifas activas", end: false },
];

export function PublicLayout() {
  const drawerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="safe-top mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold text-slate-900"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base sm:text-lg">DevSoluciones Rifas</span>
          </Link>

          <nav aria-label="Navegación principal" className="flex items-center gap-2">
            <ul className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-brand-50 text-brand-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => drawerRef.current?.open()}
              aria-label="Abrir menú de navegación"
              aria-expanded={menuOpen}
              aria-controls="public-mobile-drawer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <MobileDrawer
        drawerRef={drawerRef}
        id="public-mobile-drawer"
        label="Menú principal"
        onOpenChange={setMenuOpen}
      >
        <nav aria-label="Navegación móvil">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => drawerRef.current?.close()}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center rounded-lg px-3 text-base font-medium ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "text-slate-200 hover:bg-slate-800"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="mt-3 border-t border-slate-800 pt-3">
              <Link
                to="/admin/login"
                onClick={() => drawerRef.current?.close()}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Panel administrativo
              </Link>
            </li>
          </ul>
        </nav>
      </MobileDrawer>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DevSoluciones Rifas.</p>
          <p className="text-xs text-slate-500">
            Todo número se confirma únicamente tras verificación manual del pago.
          </p>
        </div>
      </footer>
    </div>
  );
}
