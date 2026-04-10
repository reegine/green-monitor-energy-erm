import clsx from "clsx";
import type { Severity } from "../services/mockDb";

export default function AlertCard(props: {
  title: string;
  subtitle: string;
  timeAgo: string;
  severity: Severity;
}) {
  const styles =
    props.severity === "critical"
      ? "bg-red-50 border-red-100"
      : props.severity === "warning"
      ? "bg-amber-50 border-amber-100"
      : "bg-blue-50 border-blue-100";

  return (
    <div className={clsx("rounded-2xl border p-4", styles)}>
      <div className="text-xs font-semibold text-slate-700">{props.title}</div>
      <div className="text-[11px] text-slate-500 mt-1">{props.subtitle}</div>
      <div className="text-[10px] text-slate-400 mt-3">{props.timeAgo}</div>
    </div>
  );
}