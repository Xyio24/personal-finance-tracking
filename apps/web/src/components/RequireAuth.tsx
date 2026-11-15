import { Navigate, Outlet } from 'react-router'
import { useMe } from '../lib/auth'
import { Splash } from './Splash'

export function RequireAuth() {
  const { data: user, isPending, isError, refetch } = useMe()

  if (isPending) return <Splash />

  if (isError) {
    return (
      <Splash>
        <p className="text-sm text-slate-500">Gagal terhubung ke server.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
        >
          Coba lagi
        </button>
      </Splash>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
