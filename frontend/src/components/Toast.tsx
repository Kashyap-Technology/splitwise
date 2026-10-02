import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_MS = 4000
let nextId = 1

/**
 * Minimal toast host.
 *
 * Hand-rolled rather than pulled from npm: the app has no toast library and
 * this is the only place one is needed. Adding a dependency for a dismissible
 * message is not a trade worth making.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++
    setToasts((current) => [...current, { ...t, id }])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) =>
        toast({ kind: "success", title, description }),
      error: (title, description) =>
        toast({ kind: "error", title, description }),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Fixed, not absolute: these must escape any `overflow-hidden` ancestor,
        // which several pages use. Top-right so they sit away from the sidebar
        // and the mobile nav, and animate downward from the edge.
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))] pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: number) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DEFAULT_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const accent =
    toast.kind === "success"
      ? "border-l-emerald-500"
      : toast.kind === "error"
        ? "border-l-red-500"
        : "border-l-blue-500"

  const icon =
    toast.kind === "success" ? "text-emerald-600" : toast.kind === "error" ? "text-red-600" : "text-blue-600"

  const glyph =
    toast.kind === "success" ? "M20 6 9 17l-5-5" : toast.kind === "error" ? "M18 6 6 18M6 6l12 12" : "M12 8h.01M11 12h1v4h1"

  return (
    <div
      // pointer-events-auto so the dismiss button is clickable even though the
      // container opts out of pointer events.
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 ${accent} bg-white shadow-lg p-3.5 animate-in fade-in slide-in-from-top-2`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <svg
        className={`h-4 w-4 mt-0.5 shrink-0 ${icon}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={glyph} />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-slate-500 mt-0.5 break-words">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-slate-400 hover:text-slate-900 transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider")
  }
  return context
}