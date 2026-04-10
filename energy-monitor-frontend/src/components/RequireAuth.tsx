import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../services/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = auth.getUser();
  const loc = useLocation();

  if (!user) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}