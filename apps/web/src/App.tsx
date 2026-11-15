import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { NavigationEffects } from './components/NavigationEffects'
import { OfflineNotice } from './components/OfflineNotice'
import { PageFrame } from './components/PageFrame'
import { RequireAuth } from './components/RequireAuth'
import { Toaster } from './components/Toaster'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { DebtDetailPage } from './pages/DebtDetailPage'
import { DebtsPage } from './pages/DebtsPage'
import { GoalDetailPage } from './pages/GoalDetailPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ReportPage } from './pages/ReportPage'
import { SavingsPage } from './pages/SavingsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionFormPage } from './pages/TransactionFormPage'
import { TransactionsPage } from './pages/TransactionsPage'

export function App() {
  return (
    <>
      <OfflineNotice />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="transaksi" element={<TransactionsPage />} />
            <Route path="laporan" element={<ReportPage />} />
            <Route path="tabungan" element={<SavingsPage />} />
            <Route path="tabungan/:id" element={<GoalDetailPage />} />
            <Route path="hutang" element={<DebtsPage />} />
            <Route path="hutang/:id" element={<DebtDetailPage />} />
            <Route path="pengaturan" element={<SettingsPage />} />
            <Route path="pengaturan/dompet" element={<AccountsPage />} />
            <Route path="pengaturan/kategori" element={<CategoriesPage />} />
          </Route>
          {/* Full-screen forms, without the bottom navigation. */}
          <Route element={<PageFrame />}>
            <Route path="transaksi/baru" element={<TransactionFormPage />} />
            <Route path="transaksi/:id" element={<TransactionFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavigationEffects />
      <Toaster />
    </>
  )
}
