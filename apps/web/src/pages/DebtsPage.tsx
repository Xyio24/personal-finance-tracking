import { HandCoins } from 'lucide-react'
import { ComingSoon } from '../components/ComingSoon'
import { PageHeader } from '../components/PageHeader'

export function DebtsPage() {
  return (
    <>
      <PageHeader title="Hutang & Piutang" />
      <ComingSoon
        icon={HandCoins}
        title="Siapa pinjam apa"
        description="Catat hutang dan piutang, cicilan, jatuh tempo, sampai lunas."
        phase="Fase 4"
      />
    </>
  )
}
