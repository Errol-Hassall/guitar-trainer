import type { ReactNode } from 'react'

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted/80">{hint}</p> : null}
    </div>
  )
}

export const controlClass =
  'min-h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none'
