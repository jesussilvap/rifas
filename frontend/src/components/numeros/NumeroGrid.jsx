import { Check, Clock, Lock, Search } from "lucide-react";
import { formatCOP } from "../../utils/format.js";

/**
 * Cuadrícula responsiva Mobile-First:
 * - Disponible: Magenta (#C9349B)
 * - Seleccionado: Deep Violet (#3B146B)
 * - Pendiente: Warm Yellow (#FFB458)
 * - Vendido: Coral Pink (#F36A78)
 */
export function NumeroGrid({
  numeros = [],
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
      {/* Leyenda accesible con los colores de estado */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 rounded bg-[#C9349B]"
            aria-hidden="true"
          />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 rounded bg-[#3B146B]"
            aria-hidden="true"
          />
          Seleccionado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 rounded bg-[#FFB458]"
            aria-hidden="true"
          />
          Pendiente
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3.5 w-3.5 rounded bg-[#F36A78]"
            aria-hidden="true"
          />
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
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-slate-900 focus:border-[#3B146B] focus:outline-none"
          />
        </div>

        <select
          value={estadoFilter}
          onChange={(e) => onEstadoFilterChange(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-[#3B146B] focus:outline-none"
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
              "border-[#A82780] bg-[#C9349B] text-white hover:bg-[#B22B88]";
            let statusText = "Disponible";
            let icon = null;

            if (isSelected) {
              classes =
                "border-[#260A49] bg-[#3B146B] text-white ring-2 ring-[#C9349B]";
              statusText = "Seleccionado";
              icon = <Check className="h-3.5 w-3.5" aria-hidden="true" />;
            } else if (item.estado === "PENDIENTE") {
              classes =
                "border-[#E59B3E] bg-[#FFB458] text-[#3B146B] cursor-not-allowed";
              statusText = "Pendiente";
              icon = <Clock className="h-3 w-3" aria-hidden="true" />;
            } else if (item.estado === "VENDIDO") {
              classes =
                "border-[#DC5462] bg-[#F36A78] text-[#240A3E] cursor-not-allowed";
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
