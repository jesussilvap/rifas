import { useEffect, useState } from "react";
import { configService } from "../../services/api.js";

export default function Configuracion() {
  const [general, setGeneral] = useState({
    whatsapp_comprobantes: "",
    whatsapp_soporte: "",
    instrucciones_whatsapp: "",
    plantilla_mensaje_whatsapp: "",
    horario_atencion: "",
    reserva_minutos_defecto: 15,
  });

  const [nequi, setNequi] = useState({
    medio: "NEQUI",
    titular: "",
    numero_celular: "",
    entidad: "Nequi",
    llave: "",
    activo: true,
  });

  const [breb, setBreb] = useState({
    medio: "BREB",
    titular: "",
    numero_celular: "",
    entidad: "Bre-B",
    llave: "",
    activo: true,
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    configService
      .getPublic()
      .then((res) => {
        if (res.data?.general) setGeneral(res.data.general);
        const medios = res.data?.medios_pago || [];
        const foundNequi = medios.find((m) => m.medio === "NEQUI");
        const foundBreb = medios.find((m) => m.medio === "BREB");
        if (foundNequi) setNequi((prev) => ({ ...prev, ...foundNequi, activo: true }));
        if (foundBreb) setBreb((prev) => ({ ...prev, ...foundBreb, activo: true }));
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await configService.updateGeneralAdmin(general);
      setMessage("Configuración de WhatsApp y parámetros guardada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMedio = async (e, payload, label) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await configService.updatePagosAdmin(payload);
      setMessage(`Datos de ${label} guardados correctamente.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-extrabold text-slate-900">Configuración de pagos y WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-600">
          Estos datos se muestran a los participantes en la pantalla de transferencia.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-800">
          {message}
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

      {/* Medios de pago Nequi y Bre-B */}
      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => handleSaveMedio(e, nequi, "Nequi")}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-base font-bold text-slate-900">Nequi</h2>
          <div>
            <label htmlFor="nequi-titular" className="mb-1 block text-xs font-semibold">
              Titular
            </label>
            <input
              id="nequi-titular"
              type="text"
              value={nequi.titular || ""}
              onChange={(e) => setNequi({ ...nequi, titular: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="nequi-cel" className="mb-1 block text-xs font-semibold">
              Número Nequi
            </label>
            <input
              id="nequi-cel"
              type="tel"
              inputMode="numeric"
              value={nequi.numero_celular || ""}
              onChange={(e) => setNequi({ ...nequi, numero_celular: e.target.value })}
              placeholder="3001234567"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(nequi.activo)}
              onChange={(e) => setNequi({ ...nequi, activo: e.target.checked })}
              className="h-4 w-4 accent-brand-600"
            />
            Habilitado en la pantalla de pago
          </label>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Guardar Nequi
          </button>
        </form>

        <form
          onSubmit={(e) => handleSaveMedio(e, breb, "Bre-B")}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-base font-bold text-slate-900">Bre-B</h2>
          <div>
            <label htmlFor="breb-titular" className="mb-1 block text-xs font-semibold">
              Titular
            </label>
            <input
              id="breb-titular"
              type="text"
              value={breb.titular || ""}
              onChange={(e) => setBreb({ ...breb, titular: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="breb-llave" className="mb-1 block text-xs font-semibold">
              Llave Bre-B
            </label>
            <input
              id="breb-llave"
              type="text"
              value={breb.llave || ""}
              onChange={(e) => setBreb({ ...breb, llave: e.target.value })}
              placeholder="@llave o correo/celular"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(breb.activo)}
              onChange={(e) => setBreb({ ...breb, activo: e.target.checked })}
              className="h-4 w-4 accent-brand-600"
            />
            Habilitado en la pantalla de pago
          </label>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Guardar Bre-B
          </button>
        </form>
      </div>

      {/* WhatsApp y parámetros generales */}
      <form
        onSubmit={handleSaveGeneral}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-base font-bold text-slate-900">WhatsApp y textos</h2>

        <div>
          <label htmlFor="wa-comp" className="block text-sm font-semibold text-slate-800">
            WhatsApp de comprobantes (formato internacional sin +) *
          </label>
          <span className="mb-1 block text-xs text-slate-500">
            Ejemplo Colombia: 573001234567
          </span>
          <input
            id="wa-comp"
            type="tel"
            inputMode="numeric"
            required
            pattern="^\d{10,15}$"
            value={general.whatsapp_comprobantes || ""}
            onChange={(e) =>
              setGeneral({ ...general, whatsapp_comprobantes: e.target.value })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </div>

        <div>
          <label htmlFor="wa-inst" className="mb-1 block text-sm font-semibold text-slate-800">
            Texto de instrucciones de WhatsApp
          </label>
          <textarea
            id="wa-inst"
            rows={3}
            value={general.instrucciones_whatsapp || ""}
            onChange={(e) =>
              setGeneral({ ...general, instrucciones_whatsapp: e.target.value })
            }
            className="w-full rounded-xl border border-slate-300 p-3"
          />
        </div>

        <div>
          <label htmlFor="wa-tpl" className="mb-1 block text-sm font-semibold text-slate-800">
            Plantilla del mensaje prellenado
          </label>
          <textarea
            id="wa-tpl"
            rows={5}
            value={general.plantilla_mensaje_whatsapp || ""}
            onChange={(e) =>
              setGeneral({ ...general, plantilla_mensaje_whatsapp: e.target.value })
            }
            className="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 sm:w-auto"
        >
          Guardar WhatsApp
        </button>
      </form>
    </div>
  );
}
