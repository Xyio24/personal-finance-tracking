import { Navigate, useSearchParams } from 'react-router'
import { Logo } from '../components/Logo'
import { useMe } from '../lib/auth'
import { demoSession, isDemo } from '../lib/demo'

const loginButtonClass =
  'flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 shadow-sm active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:active:bg-slate-800'

const errorMessages: Record<string, string> = {
  not_allowed: 'Akun Google ini tidak punya akses ke aplikasi ini.',
  cancelled: 'Login dibatalkan.',
  invalid_state: 'Sesi login kedaluwarsa. Silakan coba lagi.',
  oauth_failed: 'Gagal login dengan Google. Silakan coba lagi.',
}

export function LoginPage() {
  const { data: user, refetch } = useMe()
  const [params] = useSearchParams()

  if (user) return <Navigate to="/" replace />

  const error = params.get('error')
  const message = error ? (errorMessages[error] ?? 'Terjadi kesalahan. Silakan coba lagi.') : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="flex-1">
        <Logo className="size-16" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Finance</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Catat pemasukan, pengeluaran, tabungan, dan hutang — langsung dari HP.
        </p>
      </div>

      {message && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        >
          {message}
        </p>
      )}

      {isDemo ? (
        <button
          type="button"
          onClick={() => {
            demoSession.signIn()
            void refetch()
          }}
          className={loginButtonClass}
        >
          <GoogleIcon />
          Masuk dengan Google
        </button>
      ) : (
        // A real navigation (not fetch): the API redirects the browser to Google.
        <a href="/api/auth/google" className={loginButtonClass}>
          <GoogleIcon />
          Masuk dengan Google
        </a>
      )}
      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {isDemo
          ? 'Mode demo — tombol ini langsung masuk tanpa Google.'
          : 'Aplikasi pribadi — hanya akun yang terdaftar yang bisa masuk.'}
      </p>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}
