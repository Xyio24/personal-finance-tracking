import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { DebtsPage } from './pages/DebtsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SavingsPage } from './pages/SavingsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionFormPage } from './pages/TransactionFormPage'
import { TransactionsPage } from './pages/TransactionsPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="transaksi" element={<TransactionsPage />} />
          <Route path="tabungan" element={<SavingsPage />} />
          <Route path="hutang" element={<DebtsPage />} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="pengaturan/dompet" element={<AccountsPage />} />
          <Route path="pengaturan/kategori" element={<CategoriesPage />} />
        </Route>
        {/* Full-screen forms, without the bottom navigation. */}
        <Route path="transaksi/baru" element={<TransactionFormPage />} />
        <Route path="transaksi/:id" element={<TransactionFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
