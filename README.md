# Personal Finance Tracker

Aplikasi web pribadi untuk mencatat **pemasukan, pengeluaran, tabungan, dan hutang/piutang**.
Didesain _mobile-first_, login dengan Google (hanya akun yang di-allowlist), dan di-_self-host_
di server rumah lewat Cloudflare Tunnel.

## Status

| Fase              | Isi                                                          | Status |
| ----------------- | ------------------------------------------------------------ | ------ |
| 0. Fondasi        | Monorepo, database, login Google + allowlist, Docker, deploy | ✅     |
| 1. Inti           | Dompet, kategori, transaksi, transfer, riwayat per bulan     | ✅     |
| 2. Dashboard      | Grafik per kategori, tren bulanan, filter, pencarian         | ✅     |
| 3. Tabungan       | Isi tabungan, target + deadline, culik tabungan 🥷           | ✅     |
| 4. Hutang/Piutang | Catat, cicil, jatuh tempo, lunas/ikhlaskan                   | ✅     |
| 5. Polish         | PWA, export CSV, backup offsite, test e2e                    | ✅     |

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

### Preview tanpa login (mode demo)

Mau lihat tampilannya dulu tanpa Google OAuth, database, atau `.env`?

```bash
npm install
npm run dev:demo            # buka http://localhost:5173
```

Mode demo hanya ada di frontend: login dilewati dengan user palsu, dan sebuah API tiruan di
memori (dengan aturan yang sama seperti server) mengisi contoh dompet dan transaksi. Data tidak
tersimpan. API asli tetap mewajibkan session, dan build production tidak berisi kode demo sama
sekali.

### Fitur yang sudah ada

- **Dompet** (tunai, bank, e-wallet): saldo awal, saldo terkini dihitung dari transaksi, arsip
- **Kategori** pemasukan/pengeluaran dengan ikon & warna; 18 kategori awal dibuat saat login
  pertama
- **Transaksi**: pengeluaran, pemasukan, dan transfer antar dompet; ubah dan hapus
- **Riwayat** per bulan, dikelompokkan per hari, dengan total pemasukan/pengeluaran/selisih
- **Beranda**: kekayaan bersih (dompet + tabungan + piutang − hutang), hutang/piutang yang
  jatuh tempo, ringkasan bulan ini, saldo per dompet, pengeluaran per kategori, transaksi
  terakhir
- **Laporan** per bulan: pemasukan, pengeluaran, selisih, pengeluaran per hari, perbandingan
  dengan bulan lalu (bulan berjalan dibandingkan dengan tanggal yang sama), tren 6 bulan, dan
  rincian per kategori
- **Pencarian** catatan/kategori/tabungan/nama orang di semua bulan dan **filter** jenis, kategori, dompet
- **Tabungan**: pos dengan target & deadline opsional, isi tabungan, culik tabungan 🥷 (tidak
  bisa melebihi isinya), status sesuai jalur / mepet / perlu dikejar / tercapai berdasarkan laju
  menabung 3 bulan terakhir, dan riwayat per pos
- **Hutang & piutang**: catat pinjam/meminjamkan (uang masuk/keluar dari dompet, atau tanpa
  dompet seperti paylater), jatuh tempo opsional dengan tanda lewat/dekat jatuh tempo, cicil
  sampai lunas (tidak bisa melebihi sisa), dan _ikhlaskan_ piutang atau anggap hutang lunas
  (bisa dibatalkan)
- **Aplikasi di HP (PWA)**: bisa dipasang di layar utama dan berjalan tanpa bilah browser, tetap
  terbuka saat offline (data dimuat lagi begitu tersambung). Data keuangan tidak pernah disimpan
  di cache browser.
- **Ekspor CSV** semua transaksi dari Pengaturan, siap dibuka di Excel atau Google Sheets
- **Salah input bisa diperbaiki**: setiap transaksi, isi/culik, pembayaran hutang, dan hutang/
  piutang itu sendiri (termasuk tanggal, dompet, dan jenisnya) bisa diubah atau dihapus.
  Hutang/piutang dan tabungan bisa dihapus beserta seluruh riwayatnya; konfirmasinya menyebut apa
  saja yang ikut terhapus dan dompet mana yang berubah.

Uang disimpan sebagai rupiah bulat (`bigint`), jadi semua penjumlahan eksak. Isi dan culik
tabungan, juga pinjam dan bayar hutang, hanya memindahkan uang, jadi tidak dihitung sebagai
pemasukan atau pengeluaran. Saldo tidak pernah disimpan, selalu dihitung dari transaksi, jadi
menghapus atau mengubah catatan otomatis memperbaiki saldo dompet. Dompet atau kategori yang sudah
dipakai tidak bisa dihapus, hanya diarsipkan, supaya riwayat tetap utuh.

| Perintah                    | Fungsi                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run dev`               | Jalankan API + web dengan hot reload                                |
| `npm run dev:demo`          | Preview UI tanpa login, API, dan database                           |
| `npm run db:up` / `db:down` | Nyalakan / matikan database dev                                     |
| `npm run db:generate`       | Buat file migrasi baru setelah mengubah `apps/api/src/db/schema.ts` |
| `npm run db:migrate`        | Terapkan migrasi (API juga menjalankannya otomatis saat start)      |
| `npm run lint` / `format`   | Cek / rapikan kode dengan Biome                                     |
| `npm run typecheck`         | Cek tipe semua workspace                                            |
| `npm test`                  | Jalankan unit test (tanpa database)                                 |
| `npm run test:integration`  | Tes API ke PostgreSQL sungguhan (butuh `npm run db:up`)             |
| `npm run test:e2e`          | Tes browser (Playwright) di layar seukuran HP, memakai mode demo    |
| `npm run build`             | Build production (web + bundle API)                                 |

## Deploy

Lihat **[docs/DEPLOY.md](docs/DEPLOY.md)**: server Ubuntu, Cloudflare Tunnel, Google OAuth,
backup harian & restore, dan backup offsite terenkripsi ke cloud (rclone).

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
- Service worker hanya menyimpan kode aplikasi; respons `/api` (data keuangan) tidak pernah
  masuk cache browser. File ekspor CSV dikirim dengan `Cache-Control: no-store`.
- Backup offsite dienkripsi di server sebelum diunggah; penyedia cloud hanya melihat file acak.
