/** App mark (same artwork as public/favicon.svg), inlined so it renders without a request. */
export function Logo({ className = 'size-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#059669" />
      <rect x="14" y="20" width="36" height="26" rx="6" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M14 28h36" stroke="#fff" strokeWidth="4" />
      <circle cx="40" cy="37" r="3" fill="#fff" />
    </svg>
  )
}
