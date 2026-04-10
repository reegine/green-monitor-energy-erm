import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

function useHeaderDate() {
  const { pathname } = useLocation();
  const key =
    pathname.startsWith("/carbon")
      ? "carbon"
      : pathname.startsWith("/forecast")
      ? "forecast"
      : pathname.startsWith("/analytics")
      ? "analytics"
      : pathname.startsWith("/alerts")
      ? "alerts"
      : "dashboard";

  return useQuery({
    queryKey: ["headerDate", key],
    queryFn: async () => {
      switch (key) {
        case "carbon":
          return (await api.getCarbon()).headerDateText;
        case "forecast":
          return (await api.getForecast()).headerDateText;
        case "analytics":
          return (await api.getAnalytics()).headerDateText;
        case "alerts":
          return (await api.getAlerts()).headerDateText;
        default:
          return (await api.getDashboard()).headerDateText;
      }
    },
  });
}

export default function TopBar() {
  const { data } = useHeaderDate();

  return (
    <div className="flex items-center justify-end">
      <div className="text-xs text-slate-500">{data ?? " "}</div>
    </div>
  );
}