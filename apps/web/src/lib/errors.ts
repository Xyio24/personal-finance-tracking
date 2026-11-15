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
  invalid_goal: 'Tabungan ini tidak ditemukan.',
  archived_goal: 'Tabungan ini sudah diarsipkan. Aktifkan lagi untuk mengisinya.',
  insufficient_savings: 'Isi tabungan tidak cukup untuk diculik sebanyak itu.',
  invalid_debt: 'Hutang/piutang ini tidak ditemukan atau jenis pembayarannya tidak cocok.',
  debt_closed: 'Hutang/piutang ini sudah ditutup. Batalkan dulu kalau masih ada pembayaran.',
  debt_overpaid: 'Pembayaran melebihi sisa hutang/piutang.',
  debt_below_paid: 'Jumlah tidak boleh lebih kecil dari yang sudah dibayar.',
  managed_by_debt: 'Catatan ini diatur dari halaman hutang/piutangnya.',
  savings_already_used:
    'Sebagian uang dari catatan ini sudah diculik. Hapus dulu catatan culiknya, baru yang ini.',
  unauthorized: 'Sesi login berakhir. Silakan masuk lagi.',
  too_many_requests: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.message] ?? 'Terjadi kesalahan di server. Coba lagi sebentar lagi.'
  }
  return 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.'
}
