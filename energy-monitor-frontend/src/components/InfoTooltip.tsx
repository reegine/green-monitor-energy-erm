import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Info, X } from "lucide-react";

export default function InfoTooltip(props: {
  content: string;
  label: string;
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={clsx("relative inline-flex", props.className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-blue-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        aria-label={props.label}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={props.label}
          className={clsx(
            "absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-xl shadow-slate-200/70",
            props.panelClassName
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="leading-5">{props.content}</div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close help">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}