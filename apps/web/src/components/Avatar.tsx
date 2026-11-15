import { useState } from 'react'

type Props = {
  name: string | null
  email: string
  src: string | null
  className?: string
}

export function Avatar({ name, email, src, className = 'size-9' }: Props) {
  const [failed, setFailed] = useState(false)
  const initial = (name ?? email).trim().charAt(0).toUpperCase()

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        // Google profile images refuse some requests that carry a Referer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={`${className} flex items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200`}
    >
      {initial}
    </span>
  )
}
