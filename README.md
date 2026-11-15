# Personal Finance Tracker

Aplikasi web pribadi untuk mencatat **pemasukan, pengeluaran, tabungan, dan hutang/piutang**.
Didesain _mobile-first_, login dengan Google (hanya akun yang di-allowlist), dan di-_self-host_
di server rumah lewat Cloudflare Tunnel.

## Status

| Fase              | Isi                                                          | Status |
| ----------------- | ------------------------------------------------------------ | ------ |
| 0. Fondasi        | Monorepo, database, login Google + allowlist, Docker, deploy | ✅     |
| 1. Inti           | Dompet, kategori, transaksi, transfer                        | ⏳     |
| 2. Dashboard      | Ringkasan bulanan, grafik, riwayat + filter                  | ⏳     |
| 3. Tabungan       | Isi tabungan, target + deadline, culik tabungan 🥷           | ⏳     |
| 4. Hutang/Piutang | Catat, cicil, jatuh tempo, lunas/ikhlaskan                   | ⏳     |
| 5. Polish         | PWA, export CSV, backup offsite, test e2e                    | ⏳     |

## Stack

| Bagian   | Teknologi                                                    |
| -------- | ------------------------------------------------------------ |
| Frontend | React 19, Vite, Tailwind CSS 4, TanStack Query, React Router |
| Backend  | Hono (Node.js 24), Zod                                       |
| Database | PostgreSQL 18 + Drizzle ORM                                  |
| Auth     | Google OAuth 2.0 (Arctic, PKCE) + session di database        |
| Deploy   | Docker Compose + Cloudflare Tunnel                           |
| Tooling  | TypeScript, Biome, Vitest, GitHub Actions                    |

Di production, API juga menyajikan hasil build React dari **domain yang sama**, jadi tidak ada
CORS dan cookie selalu _first-party_.

```
apps/api         Backend Hono (routes → db), migrasi di apps/api/drizzle
apps/web         Frontend React (mobile-first)
packages/shared  Skema Zod & helper yang dipakai bersama (mis. formatRupiah)
docs/            Panduan deploy
```

## Menjalankan di lokal

Butuh **Node.js 24+** dan **Docker**.

```bash
cp .env.example .env        # isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS
npm install
npm run db:up               # PostgreSQL dev di localhost:5433
npm run dev                 # API :3000 + web :5173 → buka http://localhost:5173
```

Cara membuat Google OAuth client ada di [docs/DEPLOY.md](docs/DEPLOY.md#3-google-oauth).
Untuk development, tambahkan juga `http://localhost:5173/api/auth/google/callback` sebagai
redirect URI.

| Perintah                    | Fungsi                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run dev`               | Jalankan API + web dengan hot reload                                |
| `npm run db:up` / `db:down` | Nyalakan / matikan database dev                                     |
| `npm run db:generate`       | Buat file migrasi baru setelah mengubah `apps/api/src/db/schema.ts` |
| `npm run db:migrate`        | Terapkan migrasi (API juga menjalankannya otomatis saat start)      |
| `npm run lint` / `format`   | Cek / rapikan kode dengan Biome                                     |
| `npm run typecheck`         | Cek tipe semua workspace                                            |
| `npm test`                  | Jalankan unit test                                                  |
| `npm run build`             | Build production (web + bundle API)                                 |

## Deploy

Lihat **[docs/DEPLOY.md](docs/DEPLOY.md)**: server Ubuntu, Cloudflare Tunnel, Google OAuth,
backup & restore.

## Keamanan

Repositori ini publik, jadi:

- **Semua secret hanya ada di `.env`** (di-gitignore). Repo hanya berisi placeholder.
- Login hanya untuk email di `ALLOWED_EMAILS`, dicek saat login **dan** di setiap request.
- Session token acak 256-bit di cookie `HttpOnly` + `Secure` + `SameSite=Lax` (prefix
  `__Host-`); database hanya menyimpan hash SHA-256-nya.
- OAuth memakai `state` + PKCE; claim ID token (`iss`, `aud`, `email_verified`) divalidasi.
- Proteksi CSRF, rate limit pada endpoint login, header keamanan (CSP, HSTS, dll).
- Log request tidak pernah mencatat query string (kode OAuth tidak masuk log).
- Port aplikasi hanya terbuka di `127.0.0.1`; akses publik hanya lewat Cloudflare Tunnel.
