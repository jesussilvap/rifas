import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Award, Calendar, RefreshCw, ShieldCheck } from "lucide-react";
import {
  numerosService,
  reservasService,
  rifasService,
} from "../../services/api.js";
import {
  formatBogotaDate,
  formatCOP,
  formatNumero,
} from "../../utils/format.js";
import { NumeroGrid } from "../../components/numeros/NumeroGrid.jsx";
import { useAriaValidation } from "../../hooks/useAriaValidation.js";

export function DetalleRifa() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  useAriaValidation(formRef);

  const [rifa, setRifa] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    nombres_completos: "",
    whatsapp: "",
    correo: "",
    acepta_reglamento: false,
    autoriza_datos: false,
  });

  useEffect(() => {
    setLoading(true);
    rifasService
      .getBySlug(slug)
      .then((res) => setRifa(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const loadNumbers = useCallback(() => {
    if (!rifa?.id) return;
    setGridLoading(true);
    numerosService
      .listByRifa(rifa.id, {
        page,
        limit: 100,
        estado: estadoFilter,
        buscar: search,
      })
      .then((res) => setGridData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setGridLoading(false));
  }, [rifa?.id, page, estadoFilter, search]);

  useEffect(() => {
    loadNumbers();
  }, [loadNumbers]);

  const toggleNumber = (num) => {
    setSelected((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const handleReserve = async (event) => {
    event.preventDefault();
    setFormError("");
    if (selected.length === 0) {
      setFormError("Selecciona al menos un número disponible en la cuadrícula.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await reservasService.create({
        id_rifa: rifa.id,
        numeros: selected,
        ...form,
      });
      navigate(`/pago/${res.data.token_acceso}`, {
        state: { reservaInicial: res.data },
      });
    } catch (err) {
      setFormError(err.message);
      loadNumbers();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />;
  }

  if (error || !rifa) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
        {error || "No se encontró la rifa solicitada."}
      </div>
    );
  }

  const totalEstimado = selected.length * Number(rifa.precio_numero);

  return (
    <div className="space-y-8 pb-24">
      {/* Encabezado y premios */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="aspect-video overflow-hidden rounded-2xl bg-slate-200 lg:col-span-6">
          {rifa.imagen_principal ? (
            <img
              src={rifa.imagen_principal}
              alt={rifa.titulo}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Award className="h-16 w-16" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {rifa.categoria || "Rifa"}
            </span>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              Reserva: {rifa.reserva_minutos} min
            </span>
          </div>

          <h1 className="font-extrabold text-slate-900">{rifa.titulo}</h1>
          {rifa.descripcion ? (
            <p className="text-sm text-slate-600 sm:text-base">{rifa.descripcion}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-xs text-slate-500">Valor por número</p>
              <p className="text-xl font-extrabold text-emerald-700">
                {formatCOP(rifa.precio_numero, rifa.moneda)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Numeración</p>
              <p className="text-base font-bold text-slate-900">
                {formatNumero(rifa.numero_inicial, rifa.digitos_formato)} al{" "}
                {formatNumero(rifa.numero_final, rifa.digitos_formato)}
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <Calendar className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                Sorteo: <strong>{formatBogotaDate(rifa.fecha_sorteo)}</strong>
                {rifa.loteria_mecanismo ? ` · ${rifa.loteria_mecanismo}` : ""}
              </span>
            </div>
          </div>

          {rifa.autorizacion ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>
                Operador: <strong>{rifa.autorizacion.operador}</strong> · Resolución:{" "}
                <strong>{rifa.autorizacion.numero_resolucion}</strong>
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Cuadrícula de números */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900">Selecciona tus números</h2>
          <button
            type="button"
            onClick={loadNumbers}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar disponibilidad
          </button>
        </div>

        <NumeroGrid
          numeros={gridData?.numeros || []}
          resumen={gridData?.resumen || rifa.resumen_numeros}
          precioNumero={rifa.precio_numero}
          moneda={rifa.moneda}
          selected={selected}
          onToggleNumber={toggleNumber}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          estadoFilter={estadoFilter}
          onEstadoFilterChange={(val) => {
            setEstadoFilter(val);
            setPage(1);
          }}
          pagination={gridData?.pagination || { page: 1, totalPages: 1 }}
          onPageChange={setPage}
          loading={gridLoading}
        />
      </section>

      {/* Registro del participante */}
      <section
        id="registro-participante"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        <h2 className="font-bold text-slate-900">Datos del participante</h2>
        <p className="mt-1 text-sm text-slate-600">
          No necesitas crear cuenta. Al confirmar, reservaremos tus números por{" "}
          {rifa.reserva_minutos} minutos.
        </p>

        {formError ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
          >
            {formError}
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleReserve} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombres" className="block text-sm font-semibold text-slate-800">
                Nombres completos *
              </label>
              <span id="nombres-hint" className="mb-1 block text-xs text-slate-500">
                Como aparece en tu documento de identidad
              </span>
              <input
                id="nombres"
                name="nombres_completos"
                type="text"
                required
                minLength={3}
                autoComplete="name"
                aria-describedby="nombres-hint"
                data-error="nombres-error"
                value={form.nombres_completos}
                onChange={(e) => setForm({ ...form, nombres_completos: e.target.value })}
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <p id="nombres-error" className="field-error mt-1 items-center gap-1 text-xs text-rose-700">
                Ingresa al menos 3 caracteres para tu nombre completo.
              </p>
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-semibold text-slate-800">
                WhatsApp *
              </label>
              <span id="whatsapp-hint" className="mb-1 block text-xs text-slate-500">
                Ejemplo: 3001234567 o +573001234567
              </span>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                required
                pattern="^\+?[\d\s\-()]{10,20}$"
                autoComplete="tel"
                aria-describedby="whatsapp-hint"
                data-error="whatsapp-error"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <p id="whatsapp-error" className="field-error mt-1 items-center gap-1 text-xs text-rose-700">
                Ingresa un número de WhatsApp válido (10 a 15 dígitos).
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="correo" className="block text-sm font-semibold text-slate-800">
              Correo electrónico (opcional)
            </label>
            <span id="correo-hint" className="mb-1 block text-xs text-slate-500">
              Formato: nombre@correo.com
            </span>
            <input
              id="correo"
              name="correo"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-describedby="correo-hint"
              data-error="correo-error"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className="field-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <p id="correo-error" className="field-error mt-1 items-center gap-1 text-xs text-rose-700">
              Ingresa un correo electrónico válido.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                required
                checked={form.acepta_reglamento}
                onChange={(e) =>
                  setForm({ ...form, acepta_reglamento: e.target.checked })
                }
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
              />
              <span>
                Acepto el reglamento de la rifa{" "}
                {rifa.reglamento_version ? `(${rifa.reglamento_version})` : ""} y las
                condiciones de verificación manual del pago. *
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                required
                checked={form.autoriza_datos}
                onChange={(e) => setForm({ ...form, autoriza_datos: e.target.checked })}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
              />
              <span>
                Autorizo el tratamiento de mis datos personales para gestionar mi
                participación y notificación del sorteo. *
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || selected.length === 0}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Reservando números..."
              : selected.length > 0
                ? `Reservar ${selected.length} número(s) · ${formatCOP(totalEstimado, rifa.moneda)}`
                : "Selecciona al menos un número"}
          </button>
        </form>
      </section>

      {/* Barra inferior fija (sticky) para móvil respetando safe areas */}
      {selected.length > 0 ? (
        <div className="safe-bottom-bar fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 pt-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600">
                {selected.length} seleccionado(s):{" "}
                <strong className="text-slate-900">
                  {selected
                    .slice(0, 6)
                    .map((n) => formatNumero(n, rifa.digitos_formato))
                    .join(", ")}
                  {selected.length > 6 ? "…" : ""}
                </strong>
              </p>
              <p className="text-base font-extrabold text-emerald-700">
                {formatCOP(totalEstimado, rifa.moneda)}
              </p>
            </div>
            <a
              href="#registro-participante"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Continuar
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
