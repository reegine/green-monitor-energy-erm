import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import RequireAuth from "../components/RequireAuth";

import SignInPage from "../pages/SignInPage";
import SignUpPage from "../pages/SignUpPage";
import ProfilePage from "../pages/ProfilePage";

import DashboardPage from "../pages/DashboardPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ForecastPage from "../pages/ForecastPage";
import CarbonPage from "../pages/CarbonPage";
import AlertsPage from "../pages/AlertsPage";

export const router = createBrowserRouter([
  { path: "/signin", element: <SignInPage /> },
  { path: "/signup", element: <SignUpPage /> },

  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "forecast", element: <ForecastPage /> },
      { path: "carbon", element: <CarbonPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);