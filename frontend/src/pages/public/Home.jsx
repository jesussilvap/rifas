import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

export function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-slate-900 px-5 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Verificación manual garantizada
          </span>
          <h1 className="font-extrabold tracking-tight text-white">
            Participa en nuestras rifas desde tu celular en pocos pasos
          </h1>
          <p className="text-base text-slate-300">
            Elige tus números disponibles en tiempo real, reserva por 15 minutos, realiza tu
            transferencia por Nequi o Bre-B y carga tu comprobante sin crear cuenta.
          </p>
          <div className="pt-2">
            <Link
              to="/rifas"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-bold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
            >
              Ver rifas disponibles
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <Clock className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">1. Selecciona y reserva</h2>
          <p className="mt-1 text-sm text-slate-600">
            Escoge uno o varios números disponibles y asegúralos durante 15 minutos mientras
            realizas la transferencia.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">2. Sube tu comprobante</h2>
          <p className="mt-1 text-sm text-slate-600">
            Adjunta la imagen desde la galería o cámara de tu teléfono y finaliza la
            solicitud para recibir tu código.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">3. Confirmación manual</h2>
          <p className="mt-1 text-sm text-slate-600">
            Nuestro equipo verifica el ingreso real del dinero y marca tus números como
            vendidos con trazabilidad completa.
          </p>
        </article>
      </section>
    </div>
  );
}
