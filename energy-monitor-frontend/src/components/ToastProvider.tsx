import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title?: string;
  message: string;
  tone: ToastTone;
};

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastApi = {
  push(input: ToastInput): void;
  success(message: string, title?: string): void;
  error(message: string, title?: string): void;
  info(message: string, title?: string): void;
};

const ToastContext = createContext<ToastApi | null>(null);

function toneClasses(tone: ToastTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const tone = input.tone ?? "info";
      const durationMs = input.durationMs ?? 3200;

      setItems((prev) => [...prev, { id, title: input.title, message: input.message, tone }]);
      window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message: string, title?: string) => push({ message, title, tone: "success" }),
      error: (message: string, title?: string) => push({ message, title, tone: "error", durationMs: 4200 }),
      info: (message: string, title?: string) => push({ message, title, tone: "info" }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-md ${toneClasses(item.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {item.title ? <div className="text-xs font-semibold">{item.title}</div> : null}
                <div className="text-xs">{item.message}</div>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="rounded-md px-2 py-1 text-[10px] font-semibold opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
