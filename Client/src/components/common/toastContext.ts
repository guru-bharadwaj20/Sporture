import { createContext, useContext } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

/**
 * Context and hook live apart from the provider component.
 *
 * React Fast Refresh only preserves state for modules that export components
 * exclusively; mixing a hook into the same file silently disables it for the
 * whole subtree during development.
 */
export const ToastContext = createContext<ToastApi | null>(null);

/** Throws outside a provider — a silent no-op would hide missing messages. */
export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
