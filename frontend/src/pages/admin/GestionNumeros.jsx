import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Check,
  Clock,
  Download,
  Lock,
  RefreshCw,
  Search,
  Unlock,
} from "lucide-react";
import { numerosService, rifasService } from "../../services/api.js";
import { formatBogotaDate, formatCOP } from "../../utils/format.js";
import { ModalDialog } from "../../components/common/ModalDialog.jsx";

export default function GestionNumeros() {
  const { usuario } = useOutletContext() || {};
  const canRelease = usuario?.rol === "SUPER_ADMIN" || usuario?.rol === "ADMIN";

  const [rifas, setRifas] = useState([]);
  const [selectedRifaId, setSelectedRifaId] = useState("");
  const [gridData, setGridData] = useState(null);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [buscar, setBuscar] = useState("");
  const [page, setPage] = useState(1);

  const [loadingRifas, setLoadingRifas] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Selección masiva de números PENDIENTE para liberar
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Detalle individual de número
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  // Motivo de liberación
  const [motivo, setMotivo] = useState("");
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    rifasService
      .listAdmin()
      .then((res) => {
        const list = res.data || [];
        setRifas(list);
        if (list.length > 0) setSelectedRifaId(String(list[0].id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingRifas(false));
  }, []);

  const loadGrid = useCallback(() => {
    if (!selectedRifaId) return;
    setLoadingGrid(true);
    setError("");
    numerosService
      .listAdminByRifa(selectedRifaId, {
        page,
        limit: 100,
        estado: estadoFilter,
        buscar,
      })
      .then((res) => setGridData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingGrid(false));
  }, [selectedRifaId, page, estadoFilter, buscar]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const handleNumberClick = async (item) => {
    if (batchMode) {
      if (item.estado !== "PENDIENTE") return;
      setBatchSelected((prev) =>
        prev.includes(item.numero)
          ? prev.filter((n) => n !== item.numero)
          : [...prev, item.numero].sort((a, b) => a - b)
      );
      return;
    }

    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setMotivo("");
    try {
      const res = await numerosService.getDetalleAdmin(selectedRifaId, item.numero);
      setDetail(res.data);
    } catch (err) {
      setError(err.message);
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const executeRelease = async (numerosToRelease) => {
    setReleasing(true);
    setError("");
    setNotice("");
    try {
      const res = await numerosService.liberarManualAdmin({
        id_rifa: Number(selectedRifaId),
        numeros: numerosToRelease,
        motivo,
      });
      setNotice(
        `Se liberaron ${res.data.liberados} número(s) a DISPONIBLE y quedó registrado en auditoría.`
      );
      setMotivo("");
      setDetailModalOpen(false);
      setBatchModalOpen(false);
      setBatchSelected([]);
      setBatchMode(false);
      loadGrid();
    } catch (err) {
      setError(err.message);
    } finally {
      setReleasing(false);
    }
  };

  const resumen = gridData?.resumen || {
    total: 0,
    disponibles: 0,
    pendientes: 0,
    vendidos: 0,
  };
  const pagination = gridData?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-slate-900">Gestión de números</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta el inventario, toca cualquier número para ver participante e historial,
            libera pendientes con auditoría o exporta a CSV.
          </p>
        </div>

        {selectedRifaId ? (
          <div className="flex flex-wrap gap-2">
            {canRelease ? (
              <button
                type="button"
                onClick={() => {
                  setBatchMode((prev) => !prev);
                  setBatchSelected([]);
                }}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                  batchMode
                    ? "border-amber-500 bg-amber-100 text-amber-950"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Unlock className="h-4 w-4" aria-hidden="true" />
                {batchMode ? "Cancelar selección masiva" : "Liberar varios"}
              </button>
            ) : null}

            <a
              href={numerosService.getExportCsvUrl(selectedRifaId)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </a>
          </div>
        ) : null}
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
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

      {loadingRifas ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
      ) : rifas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Primero crea una rifa en el módulo <strong>Rifas</strong> para consultar su
          inventario de números.
        </div>
      ) : (
        <>
          {/* Selector de rifa y filtros */}
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label htmlFor="sel-rifa" className="mb-1 block text-xs font-semibold text-slate-600">
                Rifa
              </label>
              <select
                id="sel-rifa"
                value={selectedRifaId}
                onChange={(e) => {
                  setSelectedRifaId(e.target.value);
                  setPage(1);
                  setBatchSelected([]);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
              >
                {rifas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo} ({r.estado})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="sel-estado" className="mb-1 block text-xs font-semibold text-slate-600">
                Estado
              </label>
              <select
                id="sel-estado"
                value={estadoFilter}
                onChange={(e) => {
                  setEstadoFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="">Todos</option>
                <option value="DISPONIBLE">Disponibles</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="VENDIDO">Vendidos</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="buscar-num" className="mb-1 block text-xs font-semibold text-slate-600">
                Buscar número
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="buscar-num"
                  type="search"
                  inputMode="numeric"
                  value={buscar}
                  onChange={(e) => {
                    setBuscar(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Ej. 025"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-end sm:col-span-1">
              <button
                type="button"
                onClick={loadGrid}
                aria-label="Actualizar cuadrícula"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-extrabold text-slate-900">{resumen.total || 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-xs text-emerald-800">Disponibles</p>
              <p className="text-xl font-extrabold text-emerald-700">
                {resumen.disponibles || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-3.5">
              <p className="text-xs text-slate-700">Pendientes</p>
              <p className="text-xl font-extrabold text-slate-800">
                {resumen.pendientes || 0}
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
              <p className="text-xs text-rose-800">Vendidos</p>
              <p className="text-xl font-extrabold text-rose-700">{resumen.vendidos || 0}</p>
            </div>
          </div>

          {batchMode ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-950">
                <strong>Modo liberación masiva:</strong> toca los números grises{" "}
                <strong>PENDIENTE</strong> que deseas liberar ({batchSelected.length}{" "}
                seleccionados).
              </p>
              <button
                type="button"
                disabled={batchSelected.length === 0}
                onClick={() => {
                  setMotivo("");
                  setBatchModalOpen(true);
                }}
                className="min-h-11 shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:bg-slate-300"
              >
                Liberar {batchSelected.length} número(s)
              </button>
            </div>
          ) : null}

          {/* Cuadrícula administrativa */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            {loadingGrid ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {Array.from({ length: 20 }).map((_, idx) => (
                  <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            ) : !gridData?.numeros?.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No hay números que coincidan con el filtro.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {gridData.numeros.map((item) => {
                  const isBatchChecked = batchSelected.includes(item.numero);
                  const disabledInBatch = batchMode && item.estado !== "PENDIENTE";

                  let classes =
                    "border-[#A82780] bg-[#C9349B] text-white hover:bg-[#B22B88]";
                  let icon = null;

                  if (isBatchChecked) {
                    classes =
                      "border-[#260A49] bg-[#3B146B] text-white ring-2 ring-[#C9349B]";
                    icon = <Check className="h-3.5 w-3.5" aria-hidden="true" />;
                  } else if (item.estado === "PENDIENTE") {
                    classes =
                      "border-[#E59B3E] bg-[#FFB458] text-[#3B146B] hover:bg-[#F5A744]";
                    icon = <Clock className="h-3 w-3" aria-hidden="true" />;
                  } else if (item.estado === "VENDIDO") {
                    classes =
                      "border-[#DC5462] bg-[#F36A78] text-[#240A3E] hover:bg-[#EA5968]";
                    icon = <Lock className="h-3 w-3" aria-hidden="true" />;
                  }

                  return (
                    <button
                      key={item.numero}
                      type="button"
                      disabled={disabledInBatch}
                      onClick={() => handleNumberClick(item)}
                      title={
                        item.participante_nombre
                          ? `${item.etiqueta} · ${item.participante_nombre} (${item.estado})`
                          : `${item.etiqueta} · ${item.estado}`
                      }
                      aria-label={`Número ${item.etiqueta}, estado ${item.estado}`}
                      className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-sm font-bold transition disabled:opacity-35 ${classes}`}
                    >
                      <span>{item.etiqueta}</span>
                      {icon ? <span className="mt-0.5">{icon}</span> : null}
                    </button>
                  );
                })}
              </div>
            )}

            {pagination.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
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
                  onClick={() => setPage(pagination.page + 1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}

      {/* Modal detalle e historial de un número */}
      <ModalDialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detail ? `Número ${detail.etiqueta} · ${detail.estado}` : "Detalle del número"}
      >
        {detailLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : detail ? (
          <div className="space-y-5">
            {detail.id_reserva ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Reserva asociada actual
                </p>
                <p>
                  <strong>Participante:</strong> {detail.participante_nombre}
                </p>
                <p>
                  <strong>WhatsApp:</strong>{" "}
                  <span className="font-mono">{detail.participante_whatsapp}</span>
                </p>
                <p>
                  <strong>Reserva:</strong>{" "}
                  <span className="font-mono">{detail.reserva_codigo}</span> (
                  {detail.reserva_estado})
                </p>
                <p>
                  <strong>Total reserva ({detail.cantidad_numeros} núm.):</strong>{" "}
                  {formatCOP(detail.valor_total, detail.moneda)}
                </p>
                <p className="text-xs text-slate-500">
                  Vencimiento: {formatBogotaDate(detail.fecha_vencimiento)}
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
                Este número está <strong>DISPONIBLE</strong> y no tiene reserva activa.
              </p>
            )}

            {/* Liberación individual para PENDIENTE */}
            {canRelease && detail.estado === "PENDIENTE" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeRelease([detail.numero]);
                }}
                className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-sm font-bold text-amber-950">
                  Liberar número manualmente
                </p>
                <div>
                  <label htmlFor="motivo-ind" className="mb-1 block text-xs font-semibold">
                    Motivo obligatorio (se registra en auditoría) *
                  </label>
                  <textarea
                    id="motivo-ind"
                    required
                    minLength={5}
                    rows={2}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. El participante canceló por WhatsApp."
                    className="w-full rounded-xl border border-amber-300 bg-white p-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={releasing}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:bg-slate-300"
                >
                  <Unlock className="h-4 w-4" aria-hidden="true" />
                  {releasing ? "Liberando..." : `Liberar número ${detail.etiqueta}`}
                </button>
              </form>
            ) : null}

            {/* Historial */}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Historial de reservas y pagos
              </h2>
              {detail.historial?.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Sin movimientos previos para este número.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.historial.map((h, idx) => (
                    <li
                      key={`${h.id_reserva}-${h.pago_codigo || idx}`}
                      className="rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {h.reserva_codigo}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {h.reserva_estado}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">
                        {h.participante_nombre} ({h.participante_whatsapp})
                      </p>
                      {h.pago_codigo ? (
                        <p className="mt-0.5 text-slate-600">
                          Pago <span className="font-mono">{h.pago_codigo}</span> ·{" "}
                          {h.medio_pago} · <strong>{h.pago_estado}</strong>
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-slate-400">
                        {formatBogotaDate(h.fecha_reserva)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </ModalDialog>

      {/* Modal confirmación liberación masiva */}
      <ModalDialog
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`Liberar ${batchSelected.length} número(s) pendiente(s)`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeRelease(batchSelected);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600">
            Los números seleccionados volverán a <strong>DISPONIBLE</strong> y esta acción
            quedará registrada en la tabla de auditoría.
          </p>
          <div>
            <label htmlFor="motivo-batch" className="mb-1 block text-sm font-semibold">
              Motivo obligatorio *
            </label>
            <textarea
              id="motivo-batch"
              required
              autoFocus
              minLength={5}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Limpieza de reservas abandonadas tras validación operativa."
              className="w-full rounded-xl border border-slate-300 p-3"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBatchModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={releasing}
              className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700"
            >
              {releasing ? "Liberando..." : "Confirmar liberación"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
