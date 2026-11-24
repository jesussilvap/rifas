import { useEffect, useState } from "react";
import { rifasService } from "../../services/api.js";
import { formatCOP } from "../../utils/format.js";

export default function GestionRifas() {
  const [rifas, setRifas] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    rifasService
      .listAdmin()
      .then((res) => setRifas(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-extrabold text-slate-900">Gestión de rifas</h1>
      <p className="text-sm text-slate-600">
        Una rifa solo puede cambiar a <strong>PUBLICADA</strong> cuando cuenta con una
        autorización legal aprobada.
      </p>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {rifas.map((rifa) => (
          <article
            key={rifa.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">{rifa.titulo}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {rifa.estado}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Slug: {rifa.slug}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-700">
              <span>Precio: {formatCOP(rifa.precio_numero, rifa.moneda)}</span>
              <span>Total: {rifa.cantidad_numeros}</span>
              <span>Vendidos: {rifa.vendidos}</span>
              <span>Pendientes: {rifa.pendientes}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
