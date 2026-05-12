# Frontend Data Fetching Map
**Complete API Endpoint Mapping for Each Page**

---

## 📊 Overview
All API calls go through **`src/services/backend.ts`** (HTTP client layer) and are wrapped by **`src/services/api.ts`** (business logic layer).

**Base URL:** `http://127.0.0.1:8000/api`  
**Query Client:** `@tanstack/react-query` with 10s stale time, 5min cache

---

## 🏠 Dashboard Page
**File:** [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["dashboard"],
  queryFn: api.getDashboard,
  refetchInterval: 5000,  // ← Real-time updates every 5 seconds
})
```

### Data Fetched

| Element | Data | API Endpoints | Source Functions |
|---------|------|---------------|------------------|
| **Header Date** | Current date formatted | All endpoints (see TopBar logic) | `api.getDashboard()` |
| **Current Power Usage Card** | Latest power (W) | `/api/readings/` | `fetchReadings()` → latest watt |
| **Today's Consumption Card** | Daily kWh + % vs yesterday | `/api/readings/` | `fetchReadings()` → sum energy_kwh |
| **Carbon Emissions Card** | Today's emission (kg CO₂) + % vs yesterday | `/api/carbon/` | `fetchCarbonFootprints()` → today |
| **Real-time Chart** | Last 24h hourly power series | `/api/readings/` | `fetchReadings()` → grouped by hour |
| **Alert Notifications Box** | Top 3-5 unresolved alerts | `/api/alerts/` | `fetchAlerts()` → unresolved, sorted |
| **This Month's Usage Bar** | Total kWh this month + % of budget | `/api/readings/` | `fetchReadings()` → filter current month |
| **Peak Hours Today** | Peak time + peak W + avg W | `/api/readings/` | `fetchReadings()` → max/avg calcs |

### Backend Endpoints Called (via fetchX functions)
```
GET /api/buildings/
GET /api/rooms/
GET /api/devices/
GET /api/readings/              ← Main data source (time-series readings)
GET /api/carbon/                ← Carbon footprint lookup
GET /api/alerts/                ← Alert log
```

---

## 🚨 Alerts Page
**File:** [src/pages/AlertsPage.tsx](src/pages/AlertsPage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["alerts"],
  queryFn: api.getAlerts,
})
```

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Active Alerts Count** | # of unresolved alerts | `/api/alerts/` | `fetchAlerts()` → filter `!is_resolved` |
| **Critical Count** | # critical severity | `/api/alerts/` | `fetchAlerts()` → filter severity |
| **Warnings Count** | # warning severity | `/api/alerts/` | `fetchAlerts()` → filter severity |
| **Resolved Count** | # resolved alerts | `/api/alerts/` | `fetchAlerts()` → filter `is_resolved` |
| **Alert List** | All alerts with details | `/api/alerts/` | `fetchAlerts()` + device/room lookup |
| **Threshold Settings** | Daily limit, peak demand, budget % | `/api/threshold-settings/` OR computed from rules | `fetchThresholdSettings()` or `fetchThresholdRules()` |
| **Filter Chips** | All/Critical/Warning/Info/Resolved | localStorage (client-side) | `loadThresholds()` |

### Backend Endpoints Called
```
GET /api/alerts/                     ← Alert log (main)
GET /api/threshold-rules/            ← Alert trigger rules
GET /api/threshold-settings/         ← Global threshold config
POST /api/alerts/{id}/resolve/       ← Mark alert as resolved
PATCH /api/threshold-settings/       ← Update threshold settings
```

---

## 📈 Analytics Page
**File:** [src/pages/AnalyticsPage.tsx](src/pages/AnalyticsPage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["analytics"],
  queryFn: api.getAnalytics,
})
```

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Today's Consumption KPI** | Sum of all readings today | `/api/readings/` | Filter by today |
| **This Week KPI** | Sum of all readings this week | `/api/readings/` | Filter by last 7 days |
| **This Month KPI** | Sum of all readings this month | `/api/readings/` | Filter by current month |
| **Daily Tab Chart** | Hourly consumption line | `/api/readings/` | Group by hour, sum kWh |
| **Weekly Tab Chart** | Daily consumption line | `/api/readings/` | Group by day, sum kWh |
| **Monthly Tab Chart** | Weekly consumption line | `/api/readings/` | Group by week, sum kWh |
| **By Room Breakdown** | Room-wise consumption pie | `/api/readings/` + `/api/rooms/` | Group readings by room |
| **By Floor Breakdown** | Floor-wise consumption bar | `/api/readings/` + `/api/rooms/` | Extract floor from room name/code |
| **Activity Breakdown** | Consumption by device type (pie) | `/api/readings/` + `/api/devices/` | Group by device_type |
| **Detailed Log** | Top 8 rooms + trend % | `/api/readings/` + `/api/rooms/` | Compare current vs previous period |
| **Export CSV** | Download analytics data (client-side) | None | Data already loaded |

### Backend Endpoints Called
```
GET /api/buildings/
GET /api/rooms/
GET /api/devices/
GET /api/readings/              ← Main data (filtered/grouped client-side)
```

### Client-Side Processing
- Date range filtering (localStorage)
- Hourly/Daily/Weekly grouping
- Room floor extraction from room.code or room.name
- % change calculations vs previous period

---

## 🌍 Carbon Footprint Page
**File:** [src/pages/CarbonPage.tsx](src/pages/CarbonPage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["carbon"],
  queryFn: api.getCarbon,
})
```

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Carbon Emissions KPI** | Today's emissions (kg CO₂) | `/api/carbon/` | Lookup today's record |
| **Current vs Target KPI** | Emissions vs reduction target | `/api/carbon/` + computed | Compare with month avg |
| **Monthly vs Budget KPI** | Monthly total vs target | `/api/carbon/` | Sum month readings |
| **Per Capita KPI** | Emissions per person | `/api/carbon/` | Computed metric |
| **Emissions Trend Chart** | Monthly actual vs target line | `/api/carbon/` | Group by month |
| **Emissions by Source** | Bar chart: meter/AC/light/other | `/api/readings/` + `/api/devices/` | Sum by device_type |
| **Achievement Stats** | Trees planted, water saved, etc. | `/api/carbon/` | Computed from data |
| **Recommendations** | Carbon offset tips (static) | None | Hardcoded text |
| **Download Report** | CSV export (client-side) | None | Export modal data |

### Backend Endpoints Called
```
GET /api/buildings/
GET /api/rooms/
GET /api/devices/
GET /api/readings/              ← Energy readings (to compute emissions)
GET /api/carbon/                ← Pre-calculated carbon footprint
POST /api/carbon/recalc/        ← Manual recalculation (optional)
```

---

## 🔮 Forecast Page
**File:** [src/pages/ForecastPage.tsx](src/pages/ForecastPage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["forecast"],
  queryFn: api.getForecast,
})
```

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Insight Cards** | 4 forecast insights (static) | None | Hardcoded demo data |
| **10-Day Forecast Chart** | Predicted vs actual consumption | `/api/predictions/` | ML model predictions |
| **Anomaly Detection Chart** | Unusual consumption patterns | `/api/readings/` | Computed from historical data |
| **Trend Analysis** | 3 trend cards (up/neutral/down) | `/api/predictions/` | Derived from forecast |
| **Recommendations** | 4 optimization tips + savings | `/api/predictions/` | Hardcoded demo |

### Backend Endpoints Called
```
GET /api/buildings/
GET /api/rooms/
GET /api/devices/
GET /api/readings/              ← Historical data for anomaly detection
GET /api/predictions/           ← ML forecasted values
```

---

## 👤 Profile Page
**File:** [src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx)

### Query Hook
```typescript
useQuery({
  queryKey: ["me"],
  queryFn: () => auth.refreshProfile(),
  initialData: auth.getUser(),
})
```

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Name** | User's full name | `/api/auth/auth/me/` | JWT user profile |
| **Email** | User's email | `/api/auth/auth/me/` | JWT user profile |
| **Logout Button** | Trigger sign out | `/api/auth/auth/signout/` | POST request |

### Backend Endpoints Called
```
GET /api/auth/auth/me/          ← Fetch current user profile
POST /api/auth/auth/signout/    ← Clear session
```

---

## 🔐 Sign In Page
**File:** [src/pages/SignInPage.tsx](src/pages/SignInPage.tsx)

### No Query Hook (Manual API Call on Form Submit)

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Form Submit** | Login credentials | `/api/auth/auth/signin/` | POST email + password |
| **JWT Token Response** | Access + refresh tokens | `/api/auth/auth/signin/` | Response contains tokens |
| **User Profile** | Logged-in user data | `/api/auth/auth/me/` | Auto-fetch after signin |

### Backend Endpoints Called
```
POST /api/auth/auth/signin/         ← Authenticate (returns JWT tokens)
GET /api/auth/auth/me/              ← Fetch user profile (auto after login)
```

---

## ✍️ Sign Up Page
**File:** [src/pages/SignUpPage.tsx](src/pages/SignUpPage.tsx)

### No Query Hook (Manual API Call on Form Submit)

### Data Fetched

| Element | Data | API Endpoints | Source |
|---------|------|---------------|--------|
| **Form Submit** | Registration data | `/api/auth/users/signup/` (tried first) | POST name + email + password |
| **Fallback Endpoint** | Alternative signup | `/api/auth/auth/signup/` (if 404/403) | Public route candidates |
| **JWT Token Response** | Access + refresh tokens | Signup endpoint | Response contains tokens |
| **User Profile** | Newly created user data | `/api/auth/auth/me/` | Auto-fetch after signup |

### Backend Endpoints Called (Priority Order)
```
POST /api/auth/users/signup/        ← PRIMARY (public route) — returns 201 with tokens
POST /api/auth/auth/signup/         ← FALLBACK (protected) — returns 401 if no auth
GET /api/auth/auth/me/              ← Fetch user profile (auto after signup)
```

---

## 🧭 Top Bar Component
**File:** [src/components/TopBar.tsx](src/components/TopBar.tsx)

### Dynamic Header Date Query
```typescript
useQuery({
  queryKey: ["headerDate", key],
  queryFn: async () => {
    switch (currentPage) {
      case "/carbon" → api.getCarbon().headerDateText
      case "/forecast" → api.getForecast().headerDateText
      case "/analytics" → api.getAnalytics().headerDateText
      case "/alerts" → api.getAlerts().headerDateText
      default → api.getDashboard().headerDateText
    }
  }
})
```

| Page | Date Format | Source Function |
|------|-------------|-----------------|
| Dashboard | "Friday, January 31, 2026" | `api.getDashboard()` |
| Alerts | "Friday, January 31, 2026" | `api.getAlerts()` |
| Analytics | "Data from Jan 20 to Feb 1, 2026" | `api.getAnalytics()` |
| Carbon | "January 31, 2026" | `api.getCarbon()` |
| Forecast | "31 Jan 2026" | `api.getForecast()` |

---

## 🔌 Service Layer Architecture

### 1. **backend.ts** (Low-level HTTP + JWT)
```
fetchBuildings()         → GET /api/buildings/
fetchRooms()           → GET /api/rooms/
fetchDevices()         → GET /api/devices/
fetchReadings()        → GET /api/readings/
fetchCarbonFootprints()     → GET /api/carbon/
fetchAlerts()          → GET /api/alerts/
fetchPredictions()     → GET /api/predictions/
fetchThresholdRules()  → GET /api/threshold-rules/
fetchThresholdSettings() → GET /api/threshold-settings/

authSignUp()           → POST /api/auth/users/signup/ (primary)
authSignIn()           → POST /api/auth/auth/signin/
authRefreshToken()     → POST /api/auth/auth/token/refresh/
authMe()              → GET /api/auth/auth/me/
authSignOut()         → POST /api/auth/auth/signout/
```

### 2. **api.ts** (Business Logic + DTO Transformation)
```
api.getDashboard()     → loadMonitoringContext() → format to DashboardDTO
api.getAlerts()        → loadMonitoringContext() → format to AlertsDTO
api.getAnalytics()     → loadContext() → format to AnalyticsDTO
api.getCarbon()        → loadMonitoringContext() → format to CarbonDTO
api.getForecast()      → loadMonitoringContext() → format to ForecastDTO
```

### 3. **auth.ts** (Authentication State)
```
auth.signIn(email, password)    → authSignIn() → store tokens + user
auth.signUp(name, email, pwd)   → authSignUp() → store tokens + user
auth.signOut()                  → authSignOut() → clear tokens
auth.refreshProfile()           → authMe() → fetch updated user
auth.getUser()                  → Get cached user from localStorage
```

---

## 🔄 Data Flow Example: Dashboard Load

```
1. User navigates to /dashboard
   ↓
2. DashboardPage mounts, calls:
   useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard })
   ↓
3. api.getDashboard() executes:
   - Calls loadMonitoringContext()
   - Parallel fetches:
     ├─ fetchBuildings()      → GET /api/buildings/
     ├─ fetchRooms()         → GET /api/rooms/
     ├─ fetchDevices()       → GET /api/devices/
     ├─ fetchReadings()      → GET /api/readings/
     ├─ fetchCarbonFootprints() → GET /api/carbon/
     ├─ fetchAlerts()        → GET /api/alerts/
     ├─ fetchPredictions()   → GET /api/predictions/
     └─ fetchThresholdRules() → GET /api/threshold-rules/
   ↓
4. Data transformed into DashboardDTO:
   {
     kpis: { currentPowerUsage, todaysConsumption, carbonEmissions },
     realtimeSeries: [...],
     alertsPreview: [...],
     monthUsage: {...},
     peakHours: {...}
   }
   ↓
5. React renders all cards with data
   ↓
6. Every 5 seconds: refetchInterval triggers new api.getDashboard()
```

---

## 📝 Authentication Flow

### Sign Up → Sign In → Authenticated Requests

```
1. User submits signup form
   ↓
2. authSignUp(name, email, password)
   → POST /api/auth/users/signup/
   → Response: { access: "jwt_token", refresh: "jwt_token", ... }
   ↓
3. Tokens stored in localStorage
   ↓
4. authMe() auto-called
   → GET /api/auth/auth/me/
   → Header: Authorization: Bearer {access_token}
   ↓
5. User object cached, redirected to /dashboard
   ↓
6. All subsequent requests include bearer token
   ↓
7. If 401 received:
   → authRefreshToken() called automatically
   → POST /api/auth/auth/token/refresh/ with refresh token
   → New access token stored
   → Original request retried
```

---

## 🛠️ Environment Configuration

**File:** `.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_TIMEOUT_MS=10000
VITE_API_AUTH_PREFIX=/auth/auth
```

All endpoints are prefixed with `VITE_API_BASE_URL`, and auth endpoints use `VITE_API_AUTH_PREFIX`.

---

## 💡 Quick Reference: Which API for Which Need?

| Need | API Endpoint | Used By |
|------|--------------|---------|
| Current power usage | `/api/readings/` (latest) | Dashboard |
| Daily consumption | `/api/readings/` (filtered by date) | Dashboard, Analytics |
| Carbon emissions | `/api/carbon/` | Carbon, Dashboard |
| Alerts | `/api/alerts/` | Alerts, Dashboard |
| Predictions | `/api/predictions/` | Forecast |
| Threshold rules | `/api/threshold-rules/` | Alerts settings |
| User profile | `/api/auth/auth/me/` | Profile, Auth state |
| Device metadata | `/api/devices/` (+ rooms/buildings) | All pages (lookup) |
| Hourly breakdown | `/api/readings/` (grouped client-side) | Analytics |
| Floor breakdown | `/api/rooms/` (+ readings) | Analytics |

---

## ⚡ Performance Notes

- **Stale Time:** 10 seconds (data auto-refetches after 10s without focus)
- **Cache Time:** 5 minutes (keep data 5min even if unused)
- **Dashboard Refetch:** Every 5 seconds for "real-time" feel
- **Retry Strategy:** Max 2 retries, except 401s (auth errors fail immediately)
- **Window Focus:** No auto-refetch on window focus (disabled for simplicity)

---

**Last Updated:** 2026-01-31  
**Frontend Version:** React 19 + TypeScript + Vite  
**Backend:** Django REST Framework on http://127.0.0.1:8000/api
