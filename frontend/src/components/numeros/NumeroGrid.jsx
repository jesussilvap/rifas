import { Check, Clock, Lock, Search } from "lucide-react";
import { formatCOP } from "../../utils/format.js";

/**
 * Cuadrícula responsiva Mobile-First (Sección 4 y 16.2):
 * - Estados diferenciados por color + estilo/icono (no solo color, WCAG 1.4.1).
 * - Botones táctiles >= 44x44 px.
 * - Búsqueda rápida, filtro por estado y paginación por bloques.
 */
export function NumeroGrid({
  numeros = [],
  resumen = { total: 0, disponibles: 0, pendientes: 0, vendidos: 0 },
  precioNumero = 0,
  moneda = "COP",
  selected = [],
  onToggleNumber,
  searchValue = "",
  onSearchChange,
  estadoFilter = "",
  onEstadoFilterChange,
  pagination = { page: 1, totalPages: 1 },
  onPageChange,
  loading = false,
}) {
  const selectedSet = new Set(selected);

  return (
    <section aria-label="Cuadrícula de números" className="space-y-4">
      {/* Indicadores de estado */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-bold text-slate-900">{resumen.total || 0}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <p className="text-xs text-emerald-800">Disponibles</p>
          <p className="text-lg font-bold text-emerald-700">{resumen.disponibles || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-100 p-3">
          <p className="text-xs text-slate-700">Pendientes</p>
          <p className="text-lg font-bold text-slate-700">{resumen.pendientes || 0}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
          <p className="text-xs text-rose-800">Vendidos</p>
          <p className="text-lg font-bold text-rose-700">{resumen.vendidos || 0}</p>
        </div>
      </div>

      {/* Leyenda accesible */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-emerald-600" aria-hidden="true" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-blue-600" aria-hidden="true" />
          Seleccionado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-slate-400" aria-hidden="true" />
          Pendiente
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-rose-600" aria-hidden="true" />
          Vendido
        </span>
      </div>

      {/* Buscador y filtro */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            inputMode="numeric"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar número exacto (ej. 025)"
            aria-label="Buscar número exacto"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-slate-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <select
          value={estadoFilter}
          onChange={(e) => onEstadoFilterChange(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Solo disponibles</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="VENDIDO">Vendidos</option>
        </select>
      </div>

      {/* Cuadrícula adaptable */}
      {loading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: 20 }).map((_, idx) => (
            <div
              key={idx}
              className="h-12 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      ) : numeros.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No se encontraron números con el filtro aplicado.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {numeros.map((item) => {
            const isSelected = selectedSet.has(item.numero);
            const isAvailable = item.estado === "DISPONIBLE";

            let classes =
              "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700";
            let statusText = "Disponible";
            let icon = null;

            if (isSelected) {
              classes =
                "border-blue-700 bg-blue-600 text-white ring-2 ring-blue-300";
              statusText = "Seleccionado";
              icon = <Check className="h-3.5 w-3.5" aria-hidden="true" />;
            } else if (item.estado === "PENDIENTE") {
              classes =
                "border-slate-300 bg-slate-300 text-slate-700 cursor-not-allowed";
              statusText = "Pendiente";
              icon = <Clock className="h-3 w-3" aria-hidden="true" />;
            } else if (item.estado === "VENDIDO") {
              classes =
                "border-rose-700 bg-rose-600 text-white opacity-85 cursor-not-allowed";
              statusText = "Vendido";
              icon = <Lock className="h-3 w-3" aria-hidden="true" />;
            }

            return (
              <button
                key={item.numero}
                type="button"
                disabled={!isAvailable}
                aria-pressed={isSelected}
                aria-label={`Número ${item.etiqueta}, ${statusText}`}
                onClick={() => isAvailable && onToggleNumber(item.numero)}
                className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${classes}`}
              >
                <span>{item.etiqueta}</span>
                {icon ? <span className="mt-0.5">{icon}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Paginación por bloques */}
      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">
            Bloque {pagination.page} de {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Precio por número: <strong>{formatCOP(precioNumero, moneda)}</strong> · El total
        definitivo se valida en el servidor al reservar.
      </p>
    </section>
  );
}
