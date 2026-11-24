import { useEffect, useState } from "react";
import { adminService } from "../../services/api.js";
import { formatCOP } from "../../utils/format.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService
      .dashboard()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  const cards = [
    { label: "Rifas publicadas", value: stats?.rifas_publicadas ?? "—" },
    { label: "En borrador / revisión", value: stats?.rifas_borrador_revision ?? "—" },
    { label: "Números disponibles", value: stats?.disponibles ?? "—" },
    { label: "Números pendientes", value: stats?.pendientes ?? "—" },
    { label: "Números vendidos", value: stats?.vendidos ?? "—" },
    { label: "Pagos por revisar", value: stats?.pagos_pendientes ?? "—", highlight: true },
    {
      label: "Recaudo reportado (sin confirmar)",
      value: stats ? formatCOP(stats.recaudo_reportado) : "—",
    },
    {
      label: "Recaudo verificado (aprobado)",
      value: stats ? formatCOP(stats.recaudo_verificado) : "—",
      verified: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-extrabold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Distinción estricta entre dinero reportado por participantes y dinero efectivamente
          verificado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-4 sm:p-5 ${
              card.verified
                ? "border-emerald-200 bg-emerald-50"
                : card.highlight
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium text-slate-600">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
