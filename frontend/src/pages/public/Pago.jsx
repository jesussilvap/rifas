import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MessageCircle,
  Upload,
} from "lucide-react";
import {
  configService,
  pagosService,
  reservasService,
} from "../../services/api.js";
import {
  buildWhatsappUrl,
  copyTextSafely,
  formatBogotaDate,
  formatCOP,
} from "../../utils/format.js";
import { optimizeImageForUpload } from "../../utils/imageOptimizer.js";

/**
 * Pantalla de pago en 2 pasos (Sección 5.5 y 16.2):
 * Paso 1: Transferencia, carga de comprobante (galería/cámara) y "Finalizar solicitud".
 * Paso 2: Confirmación con código de solicitud y botón principal de WhatsApp.
 */
export function Pago() {
  const { token } = useParams();
  const location = useLocation();

  const [reserva, setReserva] = useState(location.state?.reservaInicial || null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(null);

  const [medioPago, setMedioPago] = useState("NEQUI");
  const [valorReportado, setValorReportado] = useState("");
  const [referencia, setReferencia] = useState("");
  const [file, setFile] = useState(null);
  const [optimizingImage, setOptimizingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), [token]);

  useEffect(() => {
    Promise.all([reservasService.getByToken(token), configService.getPublic()])
      .then(([resReserva, resConfig]) => {
        setReserva(resReserva.data);
        setValorReportado(String(resReserva.data.valor_total || ""));
        setConfig(resConfig.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!reserva?.fecha_vencimiento || reserva.estado !== "ACTIVA") return;
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(reserva.fecha_vencimiento).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [reserva?.fecha_vencimiento, reserva?.estado]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCopy = async (key, value) => {
    const ok = await copyTextSafely(value);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2000);
    }
  };

  const handleFileChange = async (event) => {
    const raw = event.target.files?.[0];
    if (!raw) {
      setFile(null);
      return;
    }
    setError("");
    setOptimizingImage(true);
    try {
      const optimized = await optimizeImageForUpload(raw);
      setFile(optimized);
    } finally {
      setOptimizingImage(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Adjunta la imagen del comprobante antes de finalizar tu solicitud.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("token_acceso", token);
      fd.append("medio_pago", medioPago);
      fd.append("valor_reportado", valorReportado);
      if (referencia.trim()) fd.append("referencia_transferencia", referencia.trim());
      fd.append("comprobante", file);

      const res = await pagosService.reportPublic(fd, idempotencyKey);
      setSubmitResult(res.data);
      setReserva((prev) =>
        prev ? { ...prev, estado: "PENDIENTE_VERIFICACION" } : prev
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />;
  }

  if (!reserva) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
        {error || "No se encontró la reserva."}
      </div>
    );
  }

  const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const secs = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, "0") : "00";
  const isStep2 =
    Boolean(submitResult) || reserva.estado === "PENDIENTE_VERIFICACION" || reserva.estado === "COMPLETADA";

  const whatsappInfo = submitResult?.whatsapp;
  const fallbackWaUrl =
    !whatsappInfo && config?.general?.whatsapp_comprobantes
      ? buildWhatsappUrl({
          whatsappInternacional: config.general.whatsapp_comprobantes,
          mensaje: `Hola, he realizado el pago de mi participación.\n\nRifa: ${reserva.rifa.titulo}\nNúmeros: ${reserva.numeros.join(", ")}\nValor: ${formatCOP(reserva.valor_total, reserva.rifa.moneda)}\nCódigo de solicitud: ${reserva.ultimo_pago?.codigo || reserva.codigo}`,
        })
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Resumen persistente de la reserva */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reserva {reserva.codigo}
            </p>
            <h1 className="text-xl font-extrabold text-slate-900">
              {reserva.rifa?.titulo}
            </h1>
          </div>

          {reserva.estado === "ACTIVA" && secondsLeft !== null ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>
                {mins}:{secs}
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
              {reserva.estado}
            </span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Números ({reserva.cantidad_numeros})</dt>
            <dd className="font-bold text-slate-900">{reserva.numeros?.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Total a transferir</dt>
            <dd className="text-lg font-extrabold text-emerald-700">
              {formatCOP(reserva.valor_total, reserva.rifa?.moneda)}
            </dd>
          </div>
          <div className="col-span-2 text-xs text-slate-500">
            Vencimiento: {formatBogotaDate(reserva.fecha_vencimiento)}
          </div>
        </dl>
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {/* PASO 2: Confirmación y envío por WhatsApp */}
      {isStep2 ? (
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                ¡Solicitud registrada!
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Código de solicitud:{" "}
                <strong className="font-mono text-slate-900">
                  {submitResult?.pago?.codigo || reserva.ultimo_pago?.codigo || reserva.codigo}
                </strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Importante: envío de comprobante de pago</p>
            <p className="mt-1">
              {whatsappInfo?.instrucciones ||
                `Tu solicitud fue registrada y quedó pendiente de verificación. Envía también la imagen del comprobante al número de WhatsApp ${config?.general?.whatsapp_comprobantes || ""} usando el botón inferior. Tu participación solo quedará confirmada cuando el administrador verifique el ingreso del dinero.`}
            </p>
          </div>

          <a
            href={whatsappInfo?.url || fallbackWaUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Enviar comprobante por WhatsApp
          </a>
          <p className="text-center text-xs text-slate-500">
            Al abrir WhatsApp recuerda adjuntar manualmente la captura del comprobante.
          </p>
        </section>
      ) : (
        /* PASO 1: Datos de transferencia + carga del comprobante + finalizar */
        <>
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Paso 1: Realiza tu transferencia
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(config?.medios_pago || []).map((medio) => {
                const valueToCopy = medio.numero_celular || medio.llave || "";
                const copyId = `${medio.medio}-${valueToCopy}`;
                return (
                  <div
                    key={medio.medio}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        {medio.medio === "BREB" ? "Bre-B" : "Nequi"}
                      </p>
                      {medio.titular ? (
                        <p className="text-sm font-semibold text-slate-900">
                          {medio.titular}
                        </p>
                      ) : null}
                      {valueToCopy ? (
                        <p className="font-mono text-base font-bold text-slate-900">
                          {valueToCopy}
                        </p>
                      ) : null}
                      {medio.imagen_url ? (
                        <img
                          src={medio.imagen_url}
                          alt={`QR ${medio.medio}`}
                          className="mt-2 aspect-square w-full max-w-44 rounded-lg border border-slate-200 object-contain"
                        />
                      ) : null}
                    </div>

                    {valueToCopy ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(copyId, valueToCopy)}
                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        {copiedKey === copyId ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            Copiar dato
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Adjunta tu comprobante y finaliza
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="medio" className="mb-1 block text-sm font-semibold text-slate-800">
                  Medio utilizado *
                </label>
                <select
                  id="medio"
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
                >
                  <option value="NEQUI">Nequi</option>
                  <option value="BREB">Bre-B</option>
                </select>
              </div>

              <div>
                <label htmlFor="valor" className="mb-1 block text-sm font-semibold text-slate-800">
                  Valor transferido *
                </label>
                <input
                  id="valor"
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  value={valorReportado}
                  onChange={(e) => setValorReportado(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="referencia" className="mb-1 block text-sm font-semibold text-slate-800">
                Referencia de transferencia (opcional)
              </label>
              <input
                id="referencia"
                type="text"
                maxLength={150}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej. M12345678"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="comprobante"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-emerald-500"
              >
                <Upload className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-800">
                  {optimizingImage
                    ? "Optimizando imagen para carga rápida..."
                    : file
                      ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`
                      : "Toca para cargar comprobante (galería o cámara)"}
                </span>
                <span className="text-xs text-slate-500">
                  Formatos JPG, PNG o WEBP · Compresión automática para móvil
                </span>
                <input
                  id="comprobante"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              {previewUrl ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2">
                  <img
                    src={previewUrl}
                    alt="Vista previa del comprobante"
                    className="mx-auto max-h-64 rounded-lg object-contain"
                  />
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting || optimizingImage || secondsLeft === 0}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {submitting
                ? "Enviando comprobante..."
                : optimizingImage
                  ? "Preparando imagen..."
                  : "Finalizar solicitud"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
