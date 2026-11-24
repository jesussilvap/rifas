import { useEffect, useState } from "react";
import { adminService } from "../../services/api.js";

export default function Participantes() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminService
      .participantes(q)
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message));
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-extrabold text-slate-900">Participantes</h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o WhatsApp"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div
        tabIndex={0}
        role="region"
        aria-label="Tabla de participantes"
        className="responsive-table-wrapper rounded-2xl border border-slate-200 bg-white"
      >
        <table className="responsive-table text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">WhatsApp</th>
              <th scope="col" className="px-4 py-3">Reservas</th>
              <th scope="col" className="px-4 py-3">Números comprados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="px-4 py-3 font-semibold text-slate-900">
                  {p.nombres_completos}
                </th>
                <td data-label="WhatsApp" className="px-4 py-3 font-mono text-xs">
                  {p.whatsapp}
                </td>
                <td data-label="Reservas" className="px-4 py-3">
                  {p.total_reservas}
                </td>
                <td data-label="Números comprados" className="px-4 py-3 font-bold text-emerald-700">
                  {p.numeros_comprados}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
