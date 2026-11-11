import type { ReactNode } from 'react'

const icons: Record<string, ReactNode> = {
  catalogs: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5" />
    </>
  ),
  guardian: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  weight: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M7 9a6 6 0 0 1 10 0l-5 4Zm5 4 2-6" />
    </>
  ),
  phone: (
    <path d="M8 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 2a14 14 0 0 1-6-6l2-2Z" />
  ),
  overview: (
    <>
      <path d="m3 10 9-7 9 7M5 9v11h14V9" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h3m2 3h3" />
    </>
  ),
  pets: (
    <>
      <ellipse cx="4" cy="9" rx="2" ry="3" />
      <ellipse cx="9" cy="5" rx="2" ry="3" />
      <ellipse cx="15" cy="5" rx="2" ry="3" />
      <ellipse cx="20" cy="9" rx="2" ry="3" />
      <path d="M5 18c0-2 4-7 7-7s7 5 7 7c0 5-5 2-7 2s-7 3-7-2Z" />
    </>
  ),
  clinical: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 13h6m-3-3v6" />
    </>
  ),
  grooming: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="m8 8 12 12M8 16 20 4m-9 8 2-2" />
    </>
  ),
  vaccines: (
    <>
      <path d="m16 3 5 5m-8-2 5 5M5 15l4 4m-6 2 3-3m1-6 7-7 5 5-7 7H7v-5Zm3-3 3 3m4-8 2-2" />
    </>
  ),
  reports: (
    <>
      <path d="M14 3H5v18h14V8Z" />
      <path d="M14 3v5h5M8 16v2m4-5v5m4-7v7" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-.7 2.5-2.5.5-1.5 2.6 1.5 2v2.8l-1.5 2 1.5 2.6 2.5.5L9 21h6l.7-2.5 2.5-.5 1.5-2.6-1.5-2v-2.8l1.5-2L18.2 6l-2.5-.5L15 3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
}

/** Decorative only: the adjacent text supplies the accessible label. */
export function AppIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icons[name] ?? icons.overview}
    </svg>
  )
}
