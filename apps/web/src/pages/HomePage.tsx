import { formatRupiah } from '@finance/shared'
import { ChartPie } from 'lucide-react'
import { ComingSoon } from '../components/ComingSoon'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser } from '../lib/auth'

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export function HomePage() {
  const user = useCurrentUser()
  const firstName = user.name?.split(' ')[0] ?? 'kamu'

  return (
    <>
      <PageHeader subtitle={greeting()} title={`Halo, ${firstName} 👋`} />

      <section className="mx-4 rounded-3xl bg-linear-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg shadow-emerald-600/20">
        <p className="text-sm text-emerald-100">Kekayaan bersih</p>
        {/* No transactions can be recorded yet, so the true value is zero. Wired up in Phase 2. */}
        <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupiah(0)}</p>
        <p className="mt-3 text-xs text-emerald-100/80">
          Saldo dompet + tabungan + piutang − hutang
        </p>
      </section>

      <div className="mt-6">
        <ComingSoon
          icon={ChartPie}
          title="Ringkasan bulan ini"
          description="Total pemasukan, pengeluaran, dan grafik pengeluaran per kategori."
          phase="Fase 2"
        />
      </div>
    </>
  )
}
