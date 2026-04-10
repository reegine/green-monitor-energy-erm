import clsx from "clsx";

export default function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-slate-100", className)} />;
}