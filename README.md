# Energy Monitoring Frontend (React + TypeScript)

## Overview

This frontend is now connected to the Django backend API and no longer depends on mock data for the main pages.

Implemented integration goals:

- Dynamic data for Dashboard, Analytics, Forecast, Carbon, and Alerts
- JWT authentication against backend signin/signup endpoints
- Automatic access-token refresh using refresh token
- Error-safe API calls with fallbacks to keep UI usable
- Lightweight toast notifications for async success/error actions
- Alert status update and threshold settings save connected to backend
- Environment-based API configuration via `.env`

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- TanStack React Query
- Recharts

## Project Structure

```text
energy-monitor-frontend/
├── .env
├── .env.example
├── src/
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── services/
│   │   ├── backend.ts        # HTTP client + endpoint contracts + refresh-aware request layer
│   │   ├── auth.ts           # Session storage + signin/signup/signout + profile sync
│   │   ├── api.ts            # DTO mapping layer for all pages with safe fallbacks
│   │   └── alertsRuntime.ts  # Alert resolve + thresholds local/backend sync
│   └── ...
└── package.json
```

## Environment Variables

Create `energy-monitor-frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_TIMEOUT_MS=12000
VITE_API_AUTH_PREFIX=/auth/auth
```

Notes:

- `VITE_API_BASE_URL` is the backend API base.
- `VITE_API_TIMEOUT_MS` controls request timeout in milliseconds.
- `VITE_API_AUTH_PREFIX` depends on backend route structure.
- Current backend swagger exposes auth endpoints under `/api/auth/auth/*`, so `/auth/auth` is the default.

## Backend Endpoints Used

Based on current swagger (`http://127.0.0.1:8000/api/docs/`):

- Auth:
  - `POST /api/auth/auth/signin/`
  - `POST /api/auth/auth/signup/`
  - `POST /api/auth/auth/token/refresh/`
  - `GET /api/auth/auth/me/`
  - `POST /api/auth/auth/signout/`
- Core:
  - `GET /api/core/buildings/`
  - `GET /api/core/rooms/`
  - `GET /api/core/devices/`
  - `GET /api/core/threshold-rules/`
  - `GET/PATCH /api/core/threshold-settings/current/`
- Monitoring:
  - `GET /api/monitoring/readings/`
  - `GET /api/monitoring/carbon/`
  - `GET/PATCH /api/monitoring/alerts/`
  - `GET /api/monitoring/predictions/`

## Auth and Token Refresh Flow

Implemented in `src/services/auth.ts` + `src/services/backend.ts`:

1. Sign in returns `access` + `refresh` tokens.
2. Session is stored in localStorage/sessionStorage depending on Remember Me.
3. Each API request sends `Authorization: Bearer <access>`.
4. If request returns `401`, frontend automatically attempts refresh.
5. On successful refresh, failed request is retried once.
6. If refresh fails, session is cleared and app treats user as signed out.

## Error Handling and Fallback Strategy

Implemented in the API layer:

- Request timeout with safe error messages
- JSON parse safety for non-JSON responses
- Page DTO fallbacks when backend data fails
- Partial-failure tolerance (for example, one endpoint failing does not crash full page)

UI behavior:

- Skeletons shown while loading
- Empty states shown when lists/charts are empty
- Action errors shown inline (alerts resolve / threshold update)
- Toast notifications for auth, profile, and alerts actions

## Feature Coverage

### Sign In / Sign Up

- Connected to backend auth endpoints
- Sign up supports username + name + email + password
- Username/email supported in sign in input
- Form fields are intentionally blank by default (no prefilled account)

### Profile

- Loads current user from backend `me` endpoint
- Logout clears frontend session and calls backend signout when possible

### Dashboard / Analytics / Forecast / Carbon / Alerts

- Fully data-driven from backend API
- Visualizations and cards recalculate from backend records

### Alerts Actions

- `Mark as Resolved` -> updates backend alert record
- `Configure Alerts` -> saves local draft and also PATCHes backend threshold settings when numeric values are valid

## Local Development

From `energy-monitor-frontend`:

```bash
npm install
npm run dev
```

Build validation:

```bash
npm run build
```

## Auth Troubleshooting

If Sign Up fails, check:

1. Username is unique
2. Email is unique
3. Password is strong and at least 8 characters
4. Password is not too common (Django password validation can reject common passwords)

If Sign In fails, check:

1. You entered username/email and password correctly
2. Backend server is running at the `.env` API URL
3. `VITE_API_AUTH_PREFIX` matches backend auth routes

## Known Backend Gaps / Notes

These are backend-side observations and were not modified by frontend changes:

1. Auth route nesting is duplicated (`/api/auth/auth/*`) due include-path composition.
2. Threshold settings serializer uses camelCase fields (`dailyUsageLimit`, `peakDemand`, etc.), which frontend follows.
3. Frontend computes several aggregate analytics client-side from raw backend readings (no dedicated summary endpoint yet).

## Recommended Next Improvements

1. Add backend summary endpoints for dashboard KPIs and analytics aggregations to reduce client compute cost.
2. Normalize auth URL structure to `/api/auth/*` for cleaner API surface.
3. Add backend validation/error schema consistency for cleaner frontend message mapping.
