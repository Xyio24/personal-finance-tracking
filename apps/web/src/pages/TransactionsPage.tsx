import { ArrowLeftRight } from 'lucide-react'
import { ComingSoon } from '../components/ComingSoon'
import { PageHeader } from '../components/PageHeader'

export function TransactionsPage() {
  return (
    <>
      <PageHeader title="Transaksi" />
      <ComingSoon
        icon={ArrowLeftRight}
        title="Belum ada transaksi"
        description="Catat pemasukan, pengeluaran, dan transfer antar dompet, lengkap dengan filter bulan, kategori, dan dompet."
        phase="Fase 1"
      />
    </>
  )
}
