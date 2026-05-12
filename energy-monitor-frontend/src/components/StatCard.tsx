import clsx from "clsx";
import type { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

export default function StatCard(props: {
  title: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  iconBg?: string;
  subTone?: "up" | "down" | "muted";
  tooltip?: string;
}) {
  const tone =
    props.subTone === "up"
      ? "text-red-500"
      : props.subTone === "down"
      ? "text-emerald-600"
      : "text-slate-400";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{props.title}</span>
            {props.tooltip ? <InfoTooltip label={`${props.title} help`} content={props.tooltip} /> : null}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{props.value}</div>
          {props.sub ? <div className={clsx("mt-1 text-xs", tone)}>{props.sub}</div> : null}
        </div>
        {props.icon ? (
          <div className={clsx("h-9 w-9 rounded-xl grid place-items-center", props.iconBg ?? "bg-slate-50")}>
            {props.icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}