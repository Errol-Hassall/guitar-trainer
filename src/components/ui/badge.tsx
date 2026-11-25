import type { ReactNode } from 'react'

type Variant = 'default' | 'accent' | 'teal' | 'danger' | 'success'

const variantClasses: Record<Variant, string> = {
  default: 'border-line bg-raised text-muted',
  accent: 'border-accent/40 bg-accent/15 text-accent',
  teal: 'border-teal/40 bg-teal/15 text-teal',
  danger: 'border-danger/40 bg-danger/15 text-danger',
  success: 'border-success/40 bg-success/15 text-success',
}

export function Badge({
  variant = 'default',
  children,
}: {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
