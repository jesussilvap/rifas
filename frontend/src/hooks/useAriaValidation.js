import { useEffect } from "react";

/**
 * Sincroniza aria-invalid y aria-describedby con :user-invalid (guía validate-input-after-interaction)
 * para que lectores de pantalla anuncien errores solo tras la interacción del usuario.
 */
export function useAriaValidation(formRef) {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const flagged = new WeakSet();
    const announced = new WeakSet();

    const announcer = document.createElement("div");
    announcer.setAttribute("aria-live", "polite");
    announcer.className = "visually-hidden";
    document.body.append(announcer);

    let announceTimer;
    let announcedField;

    const linkError = (el, shown) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
    };

    const announceError = (el) => {
      const errorEl = el.dataset.error ? document.getElementById(el.dataset.error) : null;
      if (!errorEl) return;
      const labelText = el.labels?.[0]?.textContent?.trim();
      const prefix = labelText ? `${labelText}: ` : "";
      clearTimeout(announceTimer);
      announcer.textContent = "";
      announcedField = el;
      announceTimer = setTimeout(() => {
        announcer.textContent = `${prefix}${errorEl.textContent.replace(/\s+/g, " ").trim()}`;
      }, 500);
    };

    const supportsUserInvalid = CSS.supports("selector(:user-invalid)");

    const syncAria = (el, announce = false) => {
      if (!el?.matches?.("input, select, textarea")) return;
      const invalid = supportsUserInvalid
        ? el.matches(":user-invalid")
        : !el.validity.valid && flagged.has(el);

      if (invalid) {
        if (announce && !announced.has(el)) {
          announceError(el);
          announced.add(el);
        }
        el.setAttribute("aria-invalid", "true");
        linkError(el, true);
        flagged.add(el);
      } else if (flagged.has(el) || el.getAttribute("aria-invalid") !== "true") {
        el.setAttribute("aria-invalid", "false");
        linkError(el, false);
        flagged.delete(el);
        announced.delete(el);
        if (announcedField === el) {
          clearTimeout(announceTimer);
          announcer.textContent = "";
        }
      }
    };

    form.querySelectorAll("input, select, textarea").forEach((el) => {
      if (!el.hasAttribute("aria-invalid")) {
        el.setAttribute("aria-invalid", "false");
      }
    });

    const onBlur = (e) => {
      if (!supportsUserInvalid && e.target.matches?.("input, select, textarea")) {
        flagged.add(e.target);
        e.target.classList.toggle("user-invalid-fallback", !e.target.validity.valid);
      }
      syncAria(e.target, true);
    };
    const onInput = (e) => {
      if (!supportsUserInvalid && flagged.has(e.target)) {
        e.target.classList.toggle("user-invalid-fallback", !e.target.validity.valid);
      }
      if (e.target.hasAttribute?.("aria-invalid")) syncAria(e.target);
    };
    const onChange = (e) => syncAria(e.target, true);
    const onInvalid = (e) => {
      announced.add(e.target);
      if (!supportsUserInvalid) {
        flagged.add(e.target);
        e.target.classList.add("user-invalid-fallback");
      }
      syncAria(e.target);
    };

    form.addEventListener("blur", onBlur, true);
    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange, true);
    form.addEventListener("invalid", onInvalid, true);

    return () => {
      clearTimeout(announceTimer);
      form.removeEventListener("blur", onBlur, true);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange, true);
      form.removeEventListener("invalid", onInvalid, true);
      announcer.remove();
    };
  }, [formRef]);
}
