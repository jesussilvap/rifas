import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { adminService } from "../../services/api.js";
import { useAriaValidation } from "../../hooks/useAriaValidation.js";

export default function Login() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  useAriaValidation(formRef);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminService.login({ correo, password });
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Panel Administrativo</h1>
            <p className="text-xs text-slate-500">DevSoluciones Rifas</p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-800">
              Correo electrónico
            </label>
            <span id="admin-email-hint" className="mb-1 block text-xs text-slate-500">
              Usa tu cuenta autorizada de administrador
            </span>
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-describedby="admin-email-hint"
              data-error="admin-email-error"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="field-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
            />
            <p id="admin-email-error" className="field-error mt-1 text-xs text-rose-700">
              Ingresa un correo electrónico válido.
            </p>
          </div>

          <div>
            <label htmlFor="admin-pass" className="mb-1 block text-sm font-semibold text-slate-800">
              Contraseña
            </label>
            <input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              data-error="admin-pass-error"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
            />
            <p id="admin-pass-error" className="field-error mt-1 text-xs text-rose-700">
              La contraseña debe tener al menos 6 caracteres.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
