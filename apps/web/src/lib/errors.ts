export class ApiError extends Error {
  readonly status: number

  constructor(status: number, code: string) {
    super(code)
    this.name = 'ApiError'
    this.status = status
  }
}

/** What each API error code means for the person using the app. */
const messages: Record<string, string> = {
  invalid_input: 'Ada isian yang belum lengkap atau tidak valid.',
  not_found: 'Data ini sudah tidak ada, mungkin sudah dihapus.',
  in_use: 'Masih dipakai oleh transaksi. Arsipkan saja supaya riwayatnya tetap utuh.',
  invalid_account: 'Dompet tidak ditemukan. Pilih dompet lain.',
  archived_account: 'Dompet ini sudah diarsipkan. Pilih dompet lain.',
  invalid_category: 'Kategori tidak cocok dengan jenis transaksi.',
  archived_category: 'Kategori ini sudah diarsipkan. Pilih kategori lain.',
  unauthorized: 'Sesi login berakhir. Silakan masuk lagi.',
  too_many_requests: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.message] ?? 'Terjadi kesalahan di server. Coba lagi sebentar lagi.'
  }
  return 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.'
}
