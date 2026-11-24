import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { pagosService } from "../../services/api.js";
import {
  buildWhatsappUrl,
  copyTextSafely,
  formatBogotaDate,
  formatCOP,
} from "../../utils/format.js";
import { ModalDialog } from "../../components/common/ModalDialog.jsx";

function buildApprovalWhatsapp(pago) {
  const digits = String(pago?.participante_whatsapp || "").replace(/\D/g, "");
  const internationalPhone =
    digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
  const medioLabel = pago?.medio_pago === "BREB" ? "Bre-B" : "Nequi";
  const fechaSorteo = pago?.fecha_sorteo
    ? formatBogotaDate(pago.fecha_sorteo)
    : "Por confirmar";

  const mensaje = [
    `¡Hola ${pago?.participante_nombre || ""}! 🎉`,
    "",
    "Tu pago ha sido VERIFICADO y APROBADO.",
    "",
    `Rifa: ${pago?.rifa_titulo || ""}`,
    `Números confirmados: ${pago?.numeros || ""}`,
    `Valor: ${formatCOP(pago?.valor_esperado, pago?.moneda || "COP")} (${medioLabel})`,
    `Código de confirmación: ${pago?.codigo || ""}`,
    `Fecha del sorteo: ${fechaSorteo}`,
    "",
    "¡Gracias por participar y mucha suerte! 🍀",
  ].join("\n");

  return {
    phone: internationalPhone,
    mensaje,
    url: buildWhatsappUrl({ whatsappInternacional: internationalPhone, mensaje }),
  };
}

/**
 * Bandeja responsiva de pagos (Sección 6 y 13.5):
 * Usa .responsive-table-wrapper con @container (width < 640px) para convertirse
 * automáticamente en tarjetas apiladas en dispositivos móviles.
 */
export default function GestionPagos() {
  const { usuario } = useOutletContext() || {};
  const canDecide = usuario?.rol === "SUPER_ADMIN" || usuario?.rol === "ADMIN";

  const [pagos, setPagos] = useState([]);
  const [estado, setEstado] = useState("PENDIENTE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptPago, setReceiptPago] = useState(null);
  const [receiptLoaded, setReceiptLoaded] = useState(false);
  const [receiptError, setReceiptError] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] = useState("RECHAZADO");
  const [approvedInfo, setApprovedInfo] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadPagos = useCallback(() => {
    setLoading(true);
    setError("");
    pagosService
      .listAdmin(estado)
      .then((res) => setPagos(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [estado]);

  useEffect(() => {
    loadPagos();
  }, [loadPagos]);

  const handleApprove = async (pago) => {
    if (!window.confirm(`¿Confirmas que el dinero ingresó a la cuenta y deseas aprobar ${pago.codigo}?`)) {
      return;
    }
    setBusyId(pago.id);
    setError("");
    try {
      const res = await pagosService.approveAdmin(pago.id);
      setCopiedMsg(false);
      setApprovedInfo(res.data || pago);
      loadPagos();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyApprovedMessage = async (text) => {
    const ok = await copyTextSafely(text);
    if (ok) {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await pagosService.rejectAdmin(rejectTarget.id, {
        observaciones: rejectReason,
        accion: rejectAction,
      });
      setRejectTarget(null);
      setRejectReason("");
      loadPagos();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-slate-900">Gestión de pagos</h1>
          <p className="text-sm text-slate-600">
            Verifica siempre el movimiento real en la cuenta receptora antes de aprobar.
          </p>
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Filtrar pagos por estado"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="REQUIERE_REVISION">Requiere revisión</option>
          <option value="APROBADO">Aprobados</option>
          <option value="RECHAZADO">Rechazados</option>
          <option value="">Todos</option>
        </select>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      ) : pagos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay solicitudes de pago en esta bandeja.
        </p>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="tabla-pagos-caption"
          className="responsive-table-wrapper rounded-2xl border border-slate-200 bg-white"
        >
          <table className="responsive-table text-sm">
            <caption id="tabla-pagos-caption" className="visually-hidden">
              Bandeja de solicitudes de pago
            </caption>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Código</th>
                <th scope="col" className="px-4 py-3">Participante</th>
                <th scope="col" className="px-4 py-3">Rifa / Números</th>
                <th scope="col" className="px-4 py-3">Medio / Valor</th>
                <th scope="col" className="px-4 py-3">Fecha</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map((pago) => (
                <tr key={pago.id}>
                  <th scope="row" className="px-4 py-3 font-mono font-bold text-slate-900">
                    {pago.codigo}
                  </th>
                  <td data-label="Participante" className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{pago.participante_nombre}</p>
                      <p className="text-xs text-slate-500">{pago.participante_whatsapp}</p>
                    </div>
                  </td>
                  <td data-label="Rifa / Números" className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{pago.rifa_titulo}</p>
                      <p className="font-mono text-xs text-slate-600">{pago.numeros}</p>
                    </div>
                  </td>
                  <td data-label="Medio / Valor" className="px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {pago.medio_pago} · {formatCOP(pago.valor_esperado)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Reportado: {formatCOP(pago.valor_reportado)}
                      </p>
                    </div>
                  </td>
                  <td data-label="Fecha" className="px-4 py-3 text-xs text-slate-600">
                    {formatBogotaDate(pago.fecha_solicitud)}
                  </td>
                  <td data-label="Estado" className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                      {pago.estado}
                    </span>
                  </td>
                  <td data-label="Acciones" className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptLoaded(false);
                          setReceiptError(false);
                          setReceiptPago(pago);
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Comprobante
                      </button>
                      {pago.estado === "APROBADO" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCopiedMsg(false);
                            setApprovedInfo(pago);
                          }}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          WhatsApp
                        </button>
                      ) : null}
                      {canDecide &&
                      (pago.estado === "PENDIENTE" || pago.estado === "REQUIERE_REVISION") ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === pago.id}
                            onClick={() => handleApprove(pago)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={busyId === pago.id}
                            onClick={() => setRejectTarget(pago)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Rechazar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Visor privado de comprobante con indicador de carga y control de error */}
      <ModalDialog
        open={Boolean(receiptPago)}
        onClose={() => setReceiptPago(null)}
        title={receiptPago ? `Comprobante ${receiptPago.codigo}` : "Comprobante"}
      >
        {receiptPago ? (
          <div className="space-y-3">
            {!receiptLoaded && !receiptError ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm text-slate-600">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600" />
                <span>Cargando comprobante...</span>
              </div>
            ) : null}

            {receiptError ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                No fue posible cargar la imagen del comprobante. Verifica que el archivo
                exista en el servidor o solicita el reenvío por WhatsApp.
              </div>
            ) : (
              <img
                src={pagosService.getPrivateReceiptUrl(receiptPago.id)}
                alt={`Comprobante de ${receiptPago.codigo}`}
                onLoad={() => setReceiptLoaded(true)}
                onError={() => {
                  setReceiptLoaded(true);
                  setReceiptError(true);
                }}
                className={`mx-auto max-h-[70dvh] rounded-xl object-contain ${
                  receiptLoaded ? "block" : "hidden"
                }`}
              />
            )}
          </div>
        ) : null}
      </ModalDialog>

      {/* Modal de rechazo con motivo obligatorio */}
      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
          <form
            onSubmit={handleRejectSubmit}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Rechazar pago {rejectTarget.codigo}
            </h2>
            <div>
              <label htmlFor="reject-action" className="mb-1 block text-sm font-semibold">
                Resolución
              </label>
              <select
                id="reject-action"
                value={rejectAction}
                onChange={(e) => setRejectAction(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              >
                <option value="RECHAZADO">Rechazo definitivo (libera los números)</option>
                <option value="REQUIERE_REVISION">
                  Solicitar corrección (+15 min de prórroga)
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="reject-reason" className="mb-1 block text-sm font-semibold">
                Motivo obligatorio *
              </label>
              <textarea
                id="reject-reason"
                required
                minLength={5}
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. El valor transferido no coincide o no aparece en la cuenta."
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busyId === rejectTarget.id}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal de confirmación por WhatsApp tras aprobar pago */}
      <ModalDialog
        open={Boolean(approvedInfo)}
        onClose={() => setApprovedInfo(null)}
        title="¡Pago aprobado! Enviar confirmación"
      >
        {approvedInfo
          ? (() => {
              const wa = buildApprovalWhatsapp(approvedInfo);
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-900">
                    El pago <strong className="font-mono">{approvedInfo.codigo}</strong> fue
                    aprobado y los números ya aparecen como <strong>VENDIDOS</strong>.
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mensaje listo para {approvedInfo.participante_nombre} (
                      {approvedInfo.participante_whatsapp})
                    </p>
                    <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-sans text-xs text-slate-800">
                      {wa.mensaje}
                    </pre>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={wa.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
                    >
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                      Enviar por WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyApprovedMessage(wa.mensaje)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          Copiar mensaje
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()
          : null}
      </ModalDialog>
    </div>
  );
}
