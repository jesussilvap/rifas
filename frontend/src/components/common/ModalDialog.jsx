import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal nativo basado en <dialog> + showModal() (guía dialog de modern-web-guidance).
 * Sin role="dialog", aria-modal ni focus-trap manuales; el navegador los gestiona.
 */
export function ModalDialog({ open, onClose, title, children, lightDismiss = true }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose?.();
    };

    dialog.addEventListener("close", handleClose);

    // Fallback de light-dismiss por coordenadas cuando closedBy no está soportado (Safari)
    let onPointerDown;
    let onPointerUp;
    if (lightDismiss && !("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      onPointerDown = (e) => {
        pressedOutside = isOutside(e);
      };
      onPointerUp = (e) => {
        if (pressedOutside && isOutside(e) && dialog.open) {
          dialog.close();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (onPointerDown) dialog.removeEventListener("pointerdown", onPointerDown);
      if (onPointerUp) dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [lightDismiss, onClose]);

  const extraAttrs = lightDismiss ? { closedby: "any" } : {};

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="app-modal"
      {...extraAttrs}
    >
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h1 id={titleId} className="text-lg font-extrabold text-slate-900">
              {title}
            </h1>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar ventana"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
