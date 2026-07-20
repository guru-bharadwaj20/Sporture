import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastApi, type ToastKind } from "./toastContext";
import "./Toast.css";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_TTL_MS = 4500;
// Errors stay longer: they usually carry something the user has to act on.
const ERROR_TTL_MS = 7000;

/**
 * Replaces `alert()`.
 *
 * `alert` blocks the main thread, cannot be styled, cannot show more than one
 * message, and on a validation failure it flattens a multi-line list into an
 * unreadable dialog. Toasts are non-blocking and stack.
 *
 * The region is a live region so screen readers announce messages without
 * stealing focus — the accessible equivalent of what `alert` did by force.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? ERROR_TTL_MS : DEFAULT_TTL_MS);
    },
    [dismiss]
  );

  // Memoised so consumers don't re-render on every toast change.
  const api = useMemo<ToastApi>(
    () => ({
      success: (m: string) => push("success", m),
      error: (m: string) => push("error", m),
      info: (m: string) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`}>
            <span className="toast__icon" aria-hidden="true">
              {toast.kind === "success" ? "✓" : toast.kind === "error" ? "!" : "i"}
            </span>
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
