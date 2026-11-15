# Deploy ke server rumah (Ubuntu + Cloudflare Tunnel)

Contoh di bawah memakai `finance.example.com` dan `you@example.com`. Ganti dengan domain dan
email kamu **hanya di file `.env` di server** — jangan pernah commit nilai asli ke repo ini.

```
Internet ──HTTPS──▶ Cloudflare ══Tunnel══▶ Server Ubuntu
                                           └─ docker compose
                                              ├─ app          (Hono + React, 127.0.0.1:3000)
                                              ├─ db           (PostgreSQL 18)
                                              ├─ backup       (pg_dump harian → ./backups)
                                              └─ cloudflared  (koneksi keluar ke Cloudflare)
```

Tidak perlu membuka port di router, tetap jalan walau ISP memakai CGNAT, HTTPS otomatis, dan IP
rumah tidak terlihat publik.

## 1. Siapkan server

```bash
# Docker Engine + Compose plugin (skrip resmi Docker)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # logout-login sekali setelah ini
docker compose version             # pastikan sudah terpasang
```

Docker otomatis menyala saat boot, dan semua container memakai `restart: unless-stopped`, jadi
aplikasi hidup lagi sendiri setelah server restart atau mati listrik.

## 2. Domain & Cloudflare Tunnel

1. **Masukkan domain ke Cloudflare** (paket Free): _Add a domain_ → ikuti petunjuknya → ganti
   _nameserver_ di panel registrar domainmu ke dua nameserver yang diberikan Cloudflare. Tunggu
   sampai status domain _Active_.
2. **Buat tunnel**: buka dashboard Cloudflare **Zero Trust** → _Networks_ → _Tunnels_ →
   _Create a tunnel_ → pilih **Cloudflared** → beri nama, mis. `finance`.
   (Nama menu bisa sedikit berbeda karena Cloudflare kadang mengubah dashboard.)
3. Di langkah _install connector_, salin **token**-nya (string panjang setelah `--token`).
   Jangan jalankan perintah install-nya — cloudflared sudah ada di `docker-compose.yml`.
4. **Public hostname** (di dashboard baru: tab _Routes_ → _Add route_ → _Published
   application_): subdomain `finance`, domain `example.com`, service type **HTTP**, URL
   **`app:3000`**. Isi persis `app:3000`, **bukan** IP server: cloudflared berjalan di jaringan
   Docker yang sama dengan container `app`, sedangkan port 3000 di server sengaja hanya
   dibuka untuk `127.0.0.1`, jadi IP LAN server tidak bisa dijangkau dan hasilnya error 502.

> **Opsional, lapisan ekstra:** pasang **Cloudflare Access** (gratis) di hostname yang sama dengan
> policy "email = emailmu". Orang asing bahkan tidak bisa melihat halaman login.

## 3. Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru.
2. **Google Auth Platform** → _Branding_: isi nama aplikasi dan email support.
3. _Audience_: pilih **External**, biarkan status **Testing**, lalu tambahkan emailmu di
   **Test users**. Selama status Testing, hanya test user yang bisa login — lapisan pengaman
   pertama sebelum `ALLOWED_EMAILS`. Google mungkin menampilkan peringatan "app belum
   diverifikasi"; itu normal untuk aplikasi pribadi, klik _Continue_.
4. _Clients_ → **Create client** → tipe **Web application**:
   - _Authorized JavaScript origins_: `https://finance.example.com` (dan `http://localhost:5173`
     untuk development)
   - _Authorized redirect URIs_:
     `https://finance.example.com/api/auth/google/callback`
     (dan `http://localhost:5173/api/auth/google/callback` untuk development)
5. Salin **Client ID** dan **Client secret**.

## 4. Jalankan aplikasi

```bash
git clone https://github.com/<username>/personal-finance-tracking.git
cd personal-finance-tracking
cp .env.example .env
chmod 600 .env
nano .env
```

Isi `.env`:

```bash
APP_URL=https://finance.example.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAILS=you@example.com
POSTGRES_PASSWORD=...          # hasil: openssl rand -hex 32
CLOUDFLARE_TUNNEL_TOKEN=...    # dari langkah 2.3
# DATABASE_URL tidak dipakai di production (diisi otomatis oleh docker-compose.yml)
```

Lalu:

```bash
docker compose up -d --build
docker compose ps                  # app harus "healthy"
docker compose logs -f app         # Ctrl+C untuk keluar
```

Buka `https://finance.example.com` dari HP dan login dengan Google. 🎉

## 5. Update ke versi terbaru

```bash
git pull
docker compose up -d --build       # migrasi database berjalan otomatis saat app start
```

## 6. Backup & restore

Container `backup` membuat dump terkompresi setiap hari di folder `./backups` (hanya bisa dibaca
root, di-gitignore) dan menyimpan 30 hari terakhir.

```bash
sudo ls -lh backups/

# Backup manual sekarang
docker compose exec backup sh -c 'umask 077; pg_dump --no-owner --clean --if-exists | gzip > /backups/manual-$(date +%F).sql.gz'

# Restore (menimpa isi database saat ini!)
sudo gunzip -c backups/finance-YYYY-MM-DD_HHMM.sql.gz | docker compose exec -T db psql -U finance -d finance
```

Folder `backups/` ada di disk yang sama dengan database. Salin secara berkala ke tempat lain
(disk lain / cloud) — otomatisasi via `rclone` direncanakan di Fase 5. **Uji restore minimal
sekali** supaya yakin backup-nya benar-benar bisa dipakai.

## Troubleshooting

| Gejala                                        | Penyebab umum                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Google: `redirect_uri_mismatch`               | `APP_URL` di `.env` tidak sama persis dengan redirect URI di Google Console (cek `https`, subdomain, tanpa `/` di akhir) |
| Kembali ke login dengan "tidak punya akses"   | Email belum ada di `ALLOWED_EMAILS` atau di _Test users_ Google                                                          |
| Cloudflare error 502 / 1033                   | Container `app` belum healthy, atau service URL tunnel bukan `http://app:3000` (mis. diisi IP server)                    |
| Domain "not resolved" / `NXDOMAIN`            | DNS router/ISP masih menyimpan jawaban "tidak ada" dari sebelum route dibuat (sampai 30 menit). Cek `nslookup <domain> 1.1.1.1`; kalau di situ sudah ada IP, tunggu atau flush DNS |
| `docker compose up` gagal "set X in .env"     | Variabel wajib di `.env` masih kosong                                                                                    |
| App tidak bisa diakses setelah restart server | `sudo systemctl enable --now docker`, lalu `docker compose ps`                                                           |
