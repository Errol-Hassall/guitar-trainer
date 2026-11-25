export function Progress({
  value,
  max = 100,
  label,
}: {
  value: number
  max?: number
  label: string
}) {
  const percent =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className="h-2 w-full overflow-hidden rounded-full bg-raised"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
