# Energy Monitoring Frontend (React + TypeScript)

## 📌 Overview

Frontend ini merupakan dashboard **Energy Monitoring berbasis IoT** yang dibangun menggunakan **React + TypeScript**.

Tujuan utama frontend ini:

* Menyajikan data energi dalam tampilan yang rapi, jelas, dan mudah dipahami
* Menampilkan modul utama: **Dashboard, Analytics, Forecast, Carbon, Alerts**
* Menyediakan autentikasi sederhana untuk simulasi akses user
* Menjadi UI foundation yang siap diintegrasikan ke backend API

Frontend ini dirancang agar **frontend-friendly, scalable, dan mudah di-maintain** untuk pengembangan tahap berikutnya.

---

## 🧱 Tech Stack

* React 19
* TypeScript
* Vite
* Tailwind CSS
* React Router DOM
* TanStack React Query
* Recharts
* Axios

---

## 📂 Struktur Project

```text
energy-monitor-frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── queryClient.ts      # React Query config
│   │   └── routes.tsx          # Route definitions
│   ├── components/             # Reusable components
│   ├── pages/                  # Main pages
│   ├── services/               # API layer + mock runtime
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
└── README.md
```

---

## 🧭 Modul & Fitur

### 1️⃣ Authentication (Simulasi)

Halaman:

* `/signin`
* `/signup`

Fitur:

* Simulasi login/register via localStorage
* Route protection dengan `RequireAuth`
* Redirect ke dashboard setelah login berhasil

---

### 2️⃣ Dashboard

* KPI konsumsi energi dan karbon
* Chart monitoring utama
* Ringkasan insight operasional

---

### 3️⃣ Energy Analytics

* Analisis mode **Daily / Weekly / Monthly**
* Date range filter
* Export CSV
* Tren historis konsumsi

---

### 4️⃣ ML Predictions

* Prediksi konsumsi energi 10 hari
* Insight anomali penggunaan
* Rekomendasi optimasi energi

---

### 5️⃣ Carbon Footprint

* Ringkasan metrik karbon
* Chart tren emisi vs target
* Rekomendasi offset karbon

---

### 6️⃣ System Alerts

* Daftar alert (`info`, `warning`, `critical`)
* Filter berdasarkan severity/status
* Resolve alert
* Threshold settings disimpan di localStorage

---

### 7️⃣ Profile

* Informasi user aktif
* Logout session

---

## 🔄 Data Flow (Frontend)

Sumber data saat ini:

* **Mock DB** (`mockDb.ts`)
* Akses via `api.ts` dan `mockServer.ts`

State management:

* Fetching & cache dengan **React Query**
* Pengaturan query di `queryClient.ts`
* Local persistence dengan localStorage (`store.ts`)

---

## 🔌 API Base URL (Target Integrasi)

```text
http://localhost:8000/api/
```

Contoh endpoint yang akan dipakai frontend:

* `/api/readings/`
* `/api/carbon/`
* `/api/alerts/`
* `/api/predictions/`

---

## 📡 Integrasi Endpoint (Frontend Friendly)

### 🔹 Dashboard

* Ambil summary KPI + chart data untuk halaman dashboard

### 🔹 Analytics

* Ambil data historis konsumsi energi berdasarkan rentang tanggal

### 🔹 Forecast

* Ambil prediksi energi + confidence interval untuk visualisasi prediktif

### 🔹 Carbon

* Ambil metrik emisi karbon dan target reduction

### 🔹 Alerts

* Ambil daftar alert
* Update status alert sebagai resolved

---

## ▶️ Menjalankan Project

### Prasyarat

* Node.js 18+
* npm

### Install dependency

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## 🧪 Alur Testing yang Disarankan

1. Jalankan frontend di mode development
2. Login melalui Sign In
3. Verifikasi data tampil di Dashboard, Analytics, Forecast, Carbon, Alerts
4. Coba filter + resolve pada Alerts
5. Coba export CSV pada Analytics
6. Logout dan login ulang untuk cek persistence localStorage

---

## 🤝 Panduan Integrasi dengan Backend

Frontend **tidak perlu menghitung business logic backend** seperti:

* Perhitungan karbon
* Evaluasi threshold
* Pembuatan alert otomatis

Frontend cukup:

* Fetch data API
* Render data ke chart/card/table
* Trigger aksi user (resolve alert, export, filter)

Semua core logic tetap ada di backend.

---

## 🚀 Roadmap Lanjutan

* Integrasi backend API penuh
* Realtime monitoring (WebSocket/SSE)
* Authentication production (JWT)
* Role-based access control
* Unit test dan integration test

---

## 👩‍💻 Author

Frontend Developer: Regine Angelina Halim

Project: Energy Monitoring System
