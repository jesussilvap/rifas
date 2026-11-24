import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  PauseCircle,
  Pencil,
  Plus,
  Rocket,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { rifasService } from "../../services/api.js";
import { formatBogotaDate, formatCOP } from "../../utils/format.js";
import { ModalDialog } from "../../components/common/ModalDialog.jsx";

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

const EMPTY_RIFA_FORM = {
  titulo: "",
  slug: "",
  categoria: "General",
  descripcion: "",
  precio_numero: "20000",
  moneda: "COP",
  numero_inicial: "0",
  numero_final: "99",
  digitos_formato: "2",
  loteria_mecanismo: "",
  reglamento_version: "v1.0",
  fecha_cierre: "",
  fecha_sorteo: "",
  reserva_minutos: "15",
};

const EMPTY_AUTH_FORM = {
  operador: "",
  entidad_autorizadora: "",
  numero_resolucion: "",
  fecha_autorizacion: "",
  estado: "APROBADA",
};

const EMPTY_PREMIO_FORM = {
  nombre: "",
  marca: "",
  modelo: "",
  cantidad: "1",
  valor_comercial: "",
  descripcion: "",
};

const STATUS_BADGES = {
  BORRADOR: "bg-slate-200 text-slate-800",
  EN_REVISION: "bg-amber-100 text-amber-900",
  PUBLICADA: "bg-brand-100 text-brand-900",
  PAUSADA: "bg-orange-100 text-orange-900",
  CERRADA: "bg-rose-100 text-rose-900",
  FINALIZADA: "bg-blue-100 text-blue-900",
  CANCELADA: "bg-slate-300 text-slate-700",
};

export default function GestionRifas() {
  const { usuario } = useOutletContext() || {};
  const canManage = usuario?.rol === "SUPER_ADMIN" || usuario?.rol === "ADMIN";

  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [rifaForm, setRifaForm] = useState(EMPTY_RIFA_FORM);
  const [editingRifa, setEditingRifa] = useState(null);

  const [authTarget, setAuthTarget] = useState(null);
  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);

  const [premioTarget, setPremioTarget] = useState(null);
  const [premioForm, setPremioForm] = useState(EMPTY_PREMIO_FORM);

  const loadRifas = useCallback(() => {
    setLoading(true);
    rifasService
      .listAdmin()
      .then((res) => setRifas(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRifas();
  }, [loadRifas]);

  const openCreateModal = () => {
    setEditingRifa(null);
    setRifaForm(EMPTY_RIFA_FORM);
    setError("");
    setCreateOpen(true);
  };

  const openEditModal = (rifa) => {
    setEditingRifa(rifa);
    setRifaForm({
      titulo: rifa.titulo || "",
      slug: rifa.slug || "",
      categoria: rifa.categoria || "",
      descripcion: rifa.descripcion || "",
      precio_numero: String(rifa.precio_numero || ""),
      moneda: rifa.moneda || "COP",
      numero_inicial: String(rifa.numero_inicial ?? 0),
      numero_final: String(rifa.numero_final ?? 99),
      digitos_formato: String(rifa.digitos_formato ?? 2),
      loteria_mecanismo: rifa.loteria_mecanismo || "",
      reglamento_version: rifa.reglamento_version || "",
      fecha_cierre: rifa.fecha_cierre ? String(rifa.fecha_cierre).slice(0, 16) : "",
      fecha_sorteo: rifa.fecha_sorteo ? String(rifa.fecha_sorteo).slice(0, 16) : "",
      reserva_minutos: String(rifa.reserva_minutos || 15),
    });
    setError("");
    setCreateOpen(true);
  };

  const openAuthModal = (rifa) => {
    setAuthTarget(rifa);
    setAuthForm({
      operador: rifa.auth_operador || "",
      entidad_autorizadora: rifa.auth_entidad || "",
      numero_resolucion: rifa.auth_resolucion || "",
      fecha_autorizacion: "",
      estado: rifa.auth_estado || "APROBADA",
    });
    setError("");
  };

  const handleSaveRifa = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editingRifa) {
        await rifasService.updateAdmin(editingRifa.id, {
          titulo: rifaForm.titulo,
          categoria: rifaForm.categoria,
          descripcion: rifaForm.descripcion,
          precio_numero: Number(rifaForm.precio_numero),
          loteria_mecanismo: rifaForm.loteria_mecanismo,
          reglamento_version: rifaForm.reglamento_version,
          fecha_cierre: rifaForm.fecha_cierre || null,
          fecha_sorteo: rifaForm.fecha_sorteo || null,
          reserva_minutos: Number(rifaForm.reserva_minutos),
        });
        setNotice("Rifa actualizada correctamente.");
      } else {
        await rifasService.createAdmin({
          ...rifaForm,
          slug: rifaForm.slug || slugify(rifaForm.titulo),
          precio_numero: Number(rifaForm.precio_numero),
          numero_inicial: Number(rifaForm.numero_inicial),
          numero_final: Number(rifaForm.numero_final),
          digitos_formato: Number(rifaForm.digitos_formato),
          reserva_minutos: Number(rifaForm.reserva_minutos),
          fecha_cierre: rifaForm.fecha_cierre || null,
          fecha_sorteo: rifaForm.fecha_sorteo || null,
        });
        setNotice(
          "Rifa creada en BORRADOR. Ahora registra su autorización legal para poder publicarla."
        );
      }
      setCreateOpen(false);
      loadRifas();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAuth = async (e) => {
    e.preventDefault();
    if (!authTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await rifasService.saveAutorizacionAdmin(authTarget.id, authForm);
      setNotice("Autorización legal registrada correctamente.");
      setAuthTarget(null);
      loadRifas();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSavePremio = async (e) => {
    e.preventDefault();
    if (!premioTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await rifasService.createPremioAdmin(premioTarget.id, {
        ...premioForm,
        cantidad: Number(premioForm.cantidad || 1),
        valor_comercial: premioForm.valor_comercial
          ? Number(premioForm.valor_comercial)
          : null,
      });
      setNotice("Premio agregado a la rifa.");
      setPremioTarget(null);
      setPremioForm(EMPTY_PREMIO_FORM);
      loadRifas();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEstado = async (rifa, nuevoEstado) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await rifasService.changeStatusAdmin(rifa.id, nuevoEstado);
      setNotice(`Rifa "${rifa.titulo}" actualizada a estado ${nuevoEstado}.`);
      loadRifas();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadImage = async (rifa, file) => {
    if (!file) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("imagen", file);
      await rifasService.uploadImageAdmin(rifa.id, fd);
      setNotice(`Imagen actualizada para "${rifa.titulo}".`);
      loadRifas();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-slate-900">Gestión de rifas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Crea rifas, agrega premios, registra la autorización legal y publícalas en el
            portal público.
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nueva rifa
          </button>
        ) : null}
      </div>

      {notice ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-900">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-60 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : rifas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Aún no hay rifas creadas</p>
          <p className="mt-1 text-sm text-slate-500">
            Pulsa <strong>Nueva rifa</strong> para crear tu primera rifa y generar sus números
            automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rifas.map((rifa) => {
            const isAuthorized = Number(rifa.tiene_autorizacion_aprobada) > 0;
            const badgeClass =
              STATUS_BADGES[rifa.estado] || "bg-slate-100 text-slate-700";

            return (
              <article
                key={rifa.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900">{rifa.titulo}</h2>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                        /rifas/{rifa.slug}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                    >
                      {rifa.estado}
                    </span>
                  </div>

                  {rifa.imagen_principal ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={rifa.imagen_principal}
                        alt={rifa.titulo}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="block text-slate-500">Precio</span>
                      <strong className="text-slate-900">
                        {formatCOP(rifa.precio_numero, rifa.moneda)}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Números</span>
                      <strong className="text-slate-900">{rifa.cantidad_numeros}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Vendidos</span>
                      <strong className="text-brand-700">{rifa.vendidos || 0}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">Premios</span>
                      <strong className="text-slate-900">{rifa.total_premios || 0}</strong>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      isAuthorized
                        ? "border-brand-200 bg-brand-50 text-brand-900"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    {isAuthorized ? (
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                    )}
                    <div>
                      {isAuthorized ? (
                        <p>
                          <strong>Autorización aprobada:</strong> {rifa.auth_operador} · Res.{" "}
                          {rifa.auth_resolucion}
                        </p>
                      ) : (
                        <p>
                          <strong>Falta autorización legal aprobada</strong> para poder cambiar
                          esta rifa a <strong>PUBLICADA</strong>.
                        </p>
                      )}
                      {rifa.fecha_sorteo ? (
                        <p className="mt-0.5 opacity-80">
                          Sorteo: {formatBogotaDate(rifa.fecha_sorteo)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {canManage ? (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEditModal(rifa)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </button>

                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      Imagen
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleUploadImage(rifa, e.target.files?.[0])}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setPremioTarget(rifa);
                        setPremioForm(EMPTY_PREMIO_FORM);
                      }}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Award className="h-4 w-4" aria-hidden="true" />
                      + Premio
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openAuthModal(rifa)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Autorización
                    </button>

                    {rifa.estado !== "PUBLICADA" ? (
                      <button
                        type="button"
                        disabled={busy || !isAuthorized}
                        title={
                          isAuthorized
                            ? "Publicar rifa en el portal público"
                            : "Registra y aprueba la autorización legal primero"
                        }
                        onClick={() => handleChangeEstado(rifa, "PUBLICADA")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Rocket className="h-4 w-4" aria-hidden="true" />
                        Publicar
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleChangeEstado(rifa, "PAUSADA")}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        >
                          <PauseCircle className="h-4 w-4" aria-hidden="true" />
                          Pausar
                        </button>
                        <a
                          href={`/rifas/${rifa.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          Ver pública
                        </a>
                      </>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Rifa */}
      <ModalDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editingRifa ? `Editar: ${editingRifa.titulo}` : "Crear nueva rifa"}
      >
        <form onSubmit={handleSaveRifa} className="space-y-4">
          <div>
            <label htmlFor="rifa-titulo" className="mb-1 block text-sm font-semibold">
              Título de la rifa *
            </label>
            <input
              id="rifa-titulo"
              type="text"
              required
              autoFocus
              minLength={3}
              value={rifaForm.titulo}
              onChange={(e) => {
                const titulo = e.target.value;
                setRifaForm((prev) => ({
                  ...prev,
                  titulo,
                  slug: editingRifa ? prev.slug : slugify(titulo),
                }));
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>

          {!editingRifa ? (
            <div>
              <label htmlFor="rifa-slug" className="mb-1 block text-sm font-semibold">
                URL amigable (slug) *
              </label>
              <input
                id="rifa-slug"
                type="text"
                required
                pattern="^[a-z0-9-]+$"
                value={rifaForm.slug}
                onChange={(e) => setRifaForm({ ...rifaForm, slug: slugify(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm"
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rifa-cat" className="mb-1 block text-sm font-semibold">
                Categoría
              </label>
              <input
                id="rifa-cat"
                type="text"
                value={rifaForm.categoria}
                onChange={(e) => setRifaForm({ ...rifaForm, categoria: e.target.value })}
                placeholder="Tecnología, Moto, Efectivo..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="rifa-precio" className="mb-1 block text-sm font-semibold">
                Precio por número (COP) *
              </label>
              <input
                id="rifa-precio"
                type="number"
                inputMode="numeric"
                required
                min="100"
                value={rifaForm.precio_numero}
                onChange={(e) => setRifaForm({ ...rifaForm, precio_numero: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          {!editingRifa ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="rifa-ini" className="mb-1 block text-xs font-semibold">
                  Número inicial *
                </label>
                <input
                  id="rifa-ini"
                  type="number"
                  inputMode="numeric"
                  required
                  min="0"
                  value={rifaForm.numero_inicial}
                  onChange={(e) =>
                    setRifaForm({ ...rifaForm, numero_inicial: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="rifa-fin" className="mb-1 block text-xs font-semibold">
                  Número final *
                </label>
                <input
                  id="rifa-fin"
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  value={rifaForm.numero_final}
                  onChange={(e) => {
                    const fin = e.target.value;
                    const digitos = Math.max(2, String(fin).length);
                    setRifaForm({
                      ...rifaForm,
                      numero_final: fin,
                      digitos_formato: String(Math.min(6, digitos)),
                    });
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="rifa-dig" className="mb-1 block text-xs font-semibold">
                  Dígitos (ej. 025)
                </label>
                <input
                  id="rifa-dig"
                  type="number"
                  inputMode="numeric"
                  required
                  min="2"
                  max="6"
                  value={rifaForm.digitos_formato}
                  onChange={(e) =>
                    setRifaForm({ ...rifaForm, digitos_formato: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rifa-cierre" className="mb-1 block text-sm font-semibold">
                Fecha de cierre
              </label>
              <input
                id="rifa-cierre"
                type="datetime-local"
                value={rifaForm.fecha_cierre}
                onChange={(e) => setRifaForm({ ...rifaForm, fecha_cierre: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="rifa-sorteo" className="mb-1 block text-sm font-semibold">
                Fecha del sorteo
              </label>
              <input
                id="rifa-sorteo"
                type="datetime-local"
                value={rifaForm.fecha_sorteo}
                onChange={(e) => setRifaForm({ ...rifaForm, fecha_sorteo: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rifa-loteria" className="mb-1 block text-sm font-semibold">
                Lotería / mecanismo
              </label>
              <input
                id="rifa-loteria"
                type="text"
                value={rifaForm.loteria_mecanismo}
                onChange={(e) =>
                  setRifaForm({ ...rifaForm, loteria_mecanismo: e.target.value })
                }
                placeholder="Ej. Lotería de Medellín (últimas 3 cifras)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="rifa-min" className="mb-1 block text-sm font-semibold">
                Minutos de reserva
              </label>
              <input
                id="rifa-min"
                type="number"
                inputMode="numeric"
                min="5"
                max="120"
                value={rifaForm.reserva_minutos}
                onChange={(e) =>
                  setRifaForm({ ...rifaForm, reserva_minutos: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rifa-desc" className="mb-1 block text-sm font-semibold">
              Descripción
            </label>
            <textarea
              id="rifa-desc"
              rows={3}
              value={rifaForm.descripcion}
              onChange={(e) => setRifaForm({ ...rifaForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {busy ? "Guardando..." : editingRifa ? "Guardar cambios" : "Crear rifa"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Autorización Legal */}
      <ModalDialog
        open={Boolean(authTarget)}
        onClose={() => setAuthTarget(null)}
        title={`Autorización legal · ${authTarget?.titulo || ""}`}
      >
        <form onSubmit={handleSaveAuth} className="space-y-4">
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Registra el operador, entidad autorizadora y resolución antes de publicar una rifa
            comercial. Para entornos de prueba, indícalo claramente en la resolución.
          </p>

          <div>
            <label htmlFor="auth-op" className="mb-1 block text-sm font-semibold">
              Operador *
            </label>
            <input
              id="auth-op"
              type="text"
              required
              autoFocus
              value={authForm.operador}
              onChange={(e) => setAuthForm({ ...authForm, operador: e.target.value })}
              placeholder="Ej. DevSoluciones S.A.S."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>

          <div>
            <label htmlFor="auth-ent" className="mb-1 block text-sm font-semibold">
              Entidad autorizadora *
            </label>
            <input
              id="auth-ent"
              type="text"
              required
              value={authForm.entidad_autorizadora}
              onChange={(e) =>
                setAuthForm({ ...authForm, entidad_autorizadora: e.target.value })
              }
              placeholder="Ej. Lotería / Secretaría de Hacienda / Pruebas MVP"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="auth-res" className="mb-1 block text-sm font-semibold">
                Número de resolución *
              </label>
              <input
                id="auth-res"
                type="text"
                required
                value={authForm.numero_resolucion}
                onChange={(e) =>
                  setAuthForm({ ...authForm, numero_resolucion: e.target.value })
                }
                placeholder="Ej. RES-2026-001"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="auth-fecha" className="mb-1 block text-sm font-semibold">
                Fecha de autorización
              </label>
              <input
                id="auth-fecha"
                type="date"
                value={authForm.fecha_autorizacion}
                onChange={(e) =>
                  setAuthForm({ ...authForm, fecha_autorizacion: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-estado" className="mb-1 block text-sm font-semibold">
              Estado de validación *
            </label>
            <select
              id="auth-estado"
              value={authForm.estado}
              onChange={(e) => setAuthForm({ ...authForm, estado: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="APROBADA">APROBADA (permite publicar)</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="RECHAZADA">RECHAZADA</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAuthTarget(null)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {busy ? "Guardando..." : "Guardar autorización"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Agregar Premio */}
      <ModalDialog
        open={Boolean(premioTarget)}
        onClose={() => setPremioTarget(null)}
        title={`Agregar premio · ${premioTarget?.titulo || ""}`}
      >
        <form onSubmit={handleSavePremio} className="space-y-4">
          <div>
            <label htmlFor="pr-nombre" className="mb-1 block text-sm font-semibold">
              Nombre del premio *
            </label>
            <input
              id="pr-nombre"
              type="text"
              required
              autoFocus
              value={premioForm.nombre}
              onChange={(e) => setPremioForm({ ...premioForm, nombre: e.target.value })}
              placeholder="Ej. iPhone 16 Pro Max"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-marca" className="mb-1 block text-sm font-semibold">
                Marca
              </label>
              <input
                id="pr-marca"
                type="text"
                value={premioForm.marca}
                onChange={(e) => setPremioForm({ ...premioForm, marca: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="pr-modelo" className="mb-1 block text-sm font-semibold">
                Modelo
              </label>
              <input
                id="pr-modelo"
                type="text"
                value={premioForm.modelo}
                onChange={(e) => setPremioForm({ ...premioForm, modelo: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-cant" className="mb-1 block text-sm font-semibold">
                Cantidad
              </label>
              <input
                id="pr-cant"
                type="number"
                inputMode="numeric"
                min="1"
                value={premioForm.cantidad}
                onChange={(e) => setPremioForm({ ...premioForm, cantidad: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="pr-val" className="mb-1 block text-sm font-semibold">
                Valor comercial (COP)
              </label>
              <input
                id="pr-val"
                type="number"
                inputMode="numeric"
                min="0"
                value={premioForm.valor_comercial}
                onChange={(e) =>
                  setPremioForm({ ...premioForm, valor_comercial: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pr-desc" className="mb-1 block text-sm font-semibold">
              Descripción
            </label>
            <textarea
              id="pr-desc"
              rows={3}
              value={premioForm.descripcion}
              onChange={(e) => setPremioForm({ ...premioForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPremioTarget(null)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {busy ? "Guardando..." : "Agregar premio"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
