import { PiggyBank } from 'lucide-react'
import { ComingSoon } from '../components/ComingSoon'
import { PageHeader } from '../components/PageHeader'

export function SavingsPage() {
  return (
    <>
      <PageHeader title="Tabungan" />
      <ComingSoon
        icon={PiggyBank}
        title="Tabungan & target"
        description="Isi tabungan, pasang target dan deadline, atau culik tabungan 🥷 kalau lagi kepepet."
        phase="Fase 3"
      />
    </>
  )
}
