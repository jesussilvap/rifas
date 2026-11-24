import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Ticket } from "lucide-react";
import { rifasService } from "../../services/api.js";
import { formatBogotaDate, formatCOP } from "../../utils/format.js";

export function Rifas() {
  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    rifasService
      .listPublic()
      .then((res) => setRifas(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-extrabold text-slate-900">Rifas publicadas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Solo se muestran rifas activas con autorización y reglamento validados.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : rifas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Ticket className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800">
            No hay rifas publicadas en este momento
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Vuelve pronto o configura una rifa de pruebas desde el panel administrativo.
          </p>
        </div>
      ) : (
        <div className="raffle-grid-container grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rifas.map((rifa) => {
            const total = Number(rifa.cantidad_numeros) || 1;
            const vendidos = Number(rifa.vendidos) || 0;
            const progreso = Math.min(100, Math.round((vendidos / total) * 100));

            return (
              <article
                key={rifa.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md"
              >
                <div className="aspect-video w-full bg-slate-100">
                  {rifa.imagen_principal ? (
                    <img
                      src={rifa.imagen_principal}
                      alt={rifa.titulo}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Ticket className="h-12 w-12" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                      {rifa.categoria || "General"}
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCOP(rifa.precio_numero, rifa.moneda)}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">{rifa.titulo}</h2>
                  {rifa.descripcion ? (
                    <p className="line-clamp-2 text-sm text-slate-600">{rifa.descripcion}</p>
                  ) : null}

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Progreso de ventas</span>
                      <span className="font-semibold">{progreso}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Sorteo: {formatBogotaDate(rifa.fecha_sorteo)}
                  </p>

                  <div className="mt-auto pt-2">
                    <Link
                      to={`/rifas/${rifa.slug}`}
                      className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      Elegir números
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
