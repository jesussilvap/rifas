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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    configService
      .getPublic()
      .then((res) => {
        if (res.data?.general) setGeneral(res.data.general);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await configService.updateGeneralAdmin(general);
      setMessage("Configuración de WhatsApp y parámetros guardada correctamente.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-extrabold text-slate-900">Configuración general y WhatsApp</h1>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSaveGeneral}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
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
          className="min-h-12 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto"
        >
          Guardar configuración
        </button>
      </form>
    </div>
  );
}
