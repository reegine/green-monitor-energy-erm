import { useEffect } from "react";

export default function Modal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose(): void;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    if (props.open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/30" onClick={props.onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[520px] rounded-2xl bg-white border border-slate-200 shadow-card">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-800">{props.title}</div>
          </div>
          <div className="px-5 py-4">{props.children}</div>
          {props.footer ? <div className="px-5 py-4 border-t border-slate-200">{props.footer}</div> : null}
        </div>
      </div>
    </div>
  );
}  