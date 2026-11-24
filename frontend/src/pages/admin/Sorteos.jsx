import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Eye,
  Plus,
  Trophy,
  Upload,
} from "lucide-react";
import { rifasService, sorteosService } from "../../services/api.js";
import { formatBogotaDate } from "../../utils/format.js";
import { ModalDialog } from "../../components/common/ModalDialog.jsx";

const EMPTY_FORM = {
  id_rifa: "",
  nombre_loteria: "",
  fecha_sorteo: "",
  resultado_oficial: "",
  numero_ganador: "",
  evidencia_url: "",
  observaciones: "",
  finalizar_rifa: true,
};

export default function Sorteos() {
  const { usuario } = useOutletContext() || {};
  const canManage = usuario?.rol === "SUPER_ADMIN" || usuario?.rol === "ADMIN";

  const [sorteos, setSorteos] = useState([]);
  const [rifas, setRifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [evidenceTarget, setEvidenceTarget] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([sorteosService.listAdmin(), rifasService.listAdmin()])
      .then(([resSorteos, resRifas]) => {
        setSorteos(resSorteos.data || []);
        setRifas(resRifas.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = () => {
    const firstRifa = rifas[0];
    setForm({
      ...EMPTY_FORM,
      id_rifa: firstRifa ? String(firstRifa.id) : "",
      nombre_loteria: firstRifa?.loteria_mecanismo || "",
      fecha_sorteo: firstRifa?.fecha_sorteo
        ? String(firstRifa.fecha_sorteo).slice(0, 16)
        : "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleRifaChange = (rifaId) => {
    const rifa = rifas.find((r) => String(r.id) === String(rifaId));
    setForm((prev) => ({
      ...prev,
      id_rifa: rifaId,
      nombre_loteria: rifa?.loteria_mecanismo || prev.nombre_loteria,
      fecha_sorteo: rifa?.fecha_sorteo
        ? String(rifa.fecha_sorteo).slice(0, 16)
        : prev.fecha_sorteo,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.id_rifa) {
      setError("Selecciona una rifa.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await sorteosService.registerAdmin(form.id_rifa, {
        nombre_loteria: form.nombre_loteria,
        fecha_sorteo: form.fecha_sorteo,
        resultado_oficial: form.resultado_oficial,
        numero_ganador: Number(form.numero_ganador),
        evidencia_url: form.evidencia_url || "",
        observaciones: form.observaciones || "",
        finalizar_rifa: form.finalizar_rifa,
      });
      setNotice(
        `Resultado registrado para el número ${res.data.numero_ganador_etiqueta} (${res.data.numero_estado}).`
      );
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadEvidence = async (sorteo, file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("evidencia", file);
      await sorteosService.uploadEvidenceAdmin(sorteo.id, fd);
      setNotice(`Acta/evidencia cargada para el sorteo #${sorteo.id}.`);
      loadData();
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
          <h1 className="font-extrabold text-slate-900">Sorteos y resultados</h1>
          <p className="mt-1 text-sm text-slate-600">
            Registra el resultado oficial de la lotería autorizada y adjunta evidencia o acta.
            El sistema nunca genera ni altera resultados.
          </p>
        </div>

        {canManage && rifas.length > 0 ? (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Registrar resultado
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
            <div key={n} className="h-56 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : sorteos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800">
            Aún no hay resultados de sorteos registrados
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando se realice el sorteo oficial, regístralo aquí con su evidencia y acta.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorteos.map((s) => {
            const isSoldWinner = s.numero_estado === "VENDIDO";
            return (
              <article
                key={s.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {s.nombre_loteria}
                      </p>
                      <h2 className="text-base font-bold text-slate-900">{s.rifa_titulo}</h2>
                    </div>
                    <div className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-center text-white">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-300">
                        Número
                      </span>
                      <span className="font-mono text-lg font-extrabold">
                        {s.numero_ganador_etiqueta}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatBogotaDate(s.fecha_sorteo)}
                    </span>
                    <span>
                      Resultado oficial: <strong>{s.resultado_oficial}</strong>
                    </span>
                  </div>

                  {isSoldWinner ? (
                    <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-950">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold">Ganador verificado (Número VENDIDO)</p>
                        <p className="mt-0.5">
                          {s.ganador_nombre} ·{" "}
                          <span className="font-mono">{s.ganador_whatsapp}</span>
                        </p>
                        <p className="mt-0.5 text-brand-800">
                          Reserva: <span className="font-mono">{s.reserva_codigo}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                        aria-hidden="true"
                      />
                      <p>
                        El número ganador estaba en estado <strong>{s.numero_estado}</strong>{" "}
                        (no vendido / sin pago aprobado).
                      </p>
                    </div>
                  )}

                  {s.observaciones ? (
                    <p className="text-xs text-slate-600">{s.observaciones}</p>
                  ) : null}

                  <p className="text-[11px] text-slate-400">
                    Registrado por {s.registrado_por_nombre || "Admin"} ·{" "}
                    {formatBogotaDate(s.creado_en)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {s.evidencia_url ? (
                    <a
                      href={s.evidencia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Fuente oficial
                    </a>
                  ) : null}

                  {s.tiene_acta_imagen ? (
                    <button
                      type="button"
                      onClick={() => setEvidenceTarget(s)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Ver acta / evidencia
                    </button>
                  ) : null}

                  {canManage ? (
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {s.tiene_acta_imagen ? "Reemplazar acta" : "Subir acta / evidencia"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleUploadEvidence(s, e.target.files?.[0])}
                      />
                    </label>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal registrar resultado */}
      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar resultado oficial del sorteo"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="sor-rifa" className="mb-1 block text-sm font-semibold">
              Rifa *
            </label>
            <select
              id="sor-rifa"
              required
              autoFocus
              value={form.id_rifa}
              onChange={(e) => handleRifaChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {rifas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.titulo} ({r.estado})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sor-lot" className="mb-1 block text-sm font-semibold">
                Lotería / mecanismo oficial *
              </label>
              <input
                id="sor-lot"
                type="text"
                required
                value={form.nombre_loteria}
                onChange={(e) => setForm({ ...form, nombre_loteria: e.target.value })}
                placeholder="Ej. Lotería de Medellín"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="sor-fecha" className="mb-1 block text-sm font-semibold">
                Fecha y hora del sorteo *
              </label>
              <input
                id="sor-fecha"
                type="datetime-local"
                required
                value={form.fecha_sorteo}
                onChange={(e) => setForm({ ...form, fecha_sorteo: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sor-res" className="mb-1 block text-sm font-semibold">
                Resultado oficial completo *
              </label>
              <input
                id="sor-res"
                type="text"
                required
                value={form.resultado_oficial}
                onChange={(e) => setForm({ ...form, resultado_oficial: e.target.value })}
                placeholder="Ej. 4825 · Serie 120"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="sor-num" className="mb-1 block text-sm font-semibold">
                Número ganador en la rifa *
              </label>
              <input
                id="sor-num"
                type="number"
                inputMode="numeric"
                required
                min="0"
                value={form.numero_ganador}
                onChange={(e) => setForm({ ...form, numero_ganador: e.target.value })}
                placeholder="Ej. 25"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sor-url" className="mb-1 block text-sm font-semibold">
              Enlace a fuente oficial (opcional)
            </label>
            <input
              id="sor-url"
              type="url"
              value={form.evidencia_url}
              onChange={(e) => setForm({ ...form, evidencia_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </div>

          <div>
            <label htmlFor="sor-obs" className="mb-1 block text-sm font-semibold">
              Observaciones / acta
            </label>
            <textarea
              id="sor-obs"
              rows={3}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.finalizar_rifa}
              onChange={(e) => setForm({ ...form, finalizar_rifa: e.target.checked })}
              className="h-5 w-5 accent-brand-600"
            />
            <span>Marcar automáticamente la rifa como FINALIZADA</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {busy ? "Registrando..." : "Guardar resultado"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Visor privado de acta / evidencia */}
      <ModalDialog
        open={Boolean(evidenceTarget)}
        onClose={() => setEvidenceTarget(null)}
        title={
          evidenceTarget
            ? `Acta / evidencia · ${evidenceTarget.rifa_titulo}`
            : "Evidencia del sorteo"
        }
      >
        {evidenceTarget ? (
          <img
            src={sorteosService.getPrivateEvidenceUrl(evidenceTarget.id)}
            alt={`Evidencia sorteo ${evidenceTarget.rifa_titulo}`}
            className="mx-auto max-h-[70dvh] rounded-xl object-contain"
          />
        ) : null}
      </ModalDialog>
    </div>
  );
}
