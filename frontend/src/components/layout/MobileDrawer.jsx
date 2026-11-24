import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { X } from "lucide-react";

/**
 * Cajón de navegación móvil basado en <dialog> + scroll-snap + IntersectionObserver
 * (guía navigation-drawer de modern-web-guidance).
 */
export function MobileDrawer({
  drawerRef,
  id,
  label = "Menú de navegación",
  title = "DevSoluciones Rifas",
  onOpenChange,
  children,
  footer,
}) {
  const dialogRef = useRef(null);
  const scrollerRef = useRef(null);
  const sheetRef = useRef(null);

  const openDrawer = useCallback(async () => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    if (!dialog || !scroller || dialog.open) return;

    dialog.showModal();

    if (!CSS.supports("scroll-initial-target", "nearest")) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: "instant" });
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
    }

    scroller.scrollTo({ left: 0, behavior: "auto" });
  }, []);

  const closeDrawer = useCallback(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    if (!dialog || !scroller || !dialog.open) return;
    scroller.scrollTo({ left: scroller.offsetWidth, behavior: "auto" });
  }, []);

  useImperativeHandle(drawerRef, () => ({ open: openDrawer, close: closeDrawer }), [
    openDrawer,
    closeDrawer,
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !scroller || !sheet) return;

    const visibleThreshold = Math.min(0.05, 1 / Math.max(window.innerWidth, 320));
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        if (entry.intersectionRatio < visibleThreshold && dialog.open) {
          dialog.close();
          onOpenChange?.(false);
        }
        if (entry.intersectionRatio >= 0.99 && dialog.open) {
          onOpenChange?.(true);
        }
      },
      { root: dialog, threshold: [visibleThreshold, 1] }
    );
    observer.observe(sheet);

    // Fallback de opacidad de backdrop cuando el navegador no soporta scroll-driven animations
    let onScroll;
    if (!CSS.supports("animation-timeline: scroll()")) {
      onScroll = () => {
        const width = sheet.offsetWidth || 1;
        const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / width));
        dialog.style.setProperty("--drawer-backdrop", String(ratio));
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });
    }

    const onDialogClick = (event) => {
      if (!sheet.contains(event.target)) {
        closeDrawer();
      }
    };

    const onCancel = (event) => {
      if (event.cancelable) {
        event.preventDefault();
        closeDrawer();
      }
    };

    dialog.addEventListener("click", onDialogClick);
    dialog.addEventListener("cancel", onCancel);

    return () => {
      observer.disconnect();
      if (onScroll) scroller.removeEventListener("scroll", onScroll);
      dialog.removeEventListener("click", onDialogClick);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [closeDrawer, onOpenChange]);

  return (
    <dialog ref={dialogRef} id={id} className="nav-drawer" aria-label={label}>
      <div ref={scrollerRef} className="nav-drawer-scroller">
        <div
          ref={sheetRef}
          className="nav-drawer-sheet bg-slate-900 text-slate-50 shadow-2xl"
        >
          <div className="safe-top flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <span className="font-bold tracking-tight text-white">{title}</span>
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Cerrar menú"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">{children}</div>
          {footer ? (
            <div className="safe-bottom-bar border-t border-slate-800 px-4 pt-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
