import type { CSSProperties, ReactNode } from 'react'

/**
 * The one palette for tinted stat cards.
 *
 * Four of these components used to exist -- SummaryCard on the group page plus
 * a private StatCard on expenses, settlement and categories -- and three of
 * them were flat white panels with a coloured icon chip. Only the group page
 * had the gradient. Keeping the tones here means a card looks the same
 * wherever it appears, and adding a tone is a one-place change.
 *
 * Dark mode needs no `dark:` variants on any of these classes. index.css
 * re-points each of them at a dark tint under `.dark`:
 *
 *   - the gradient's three stops (`from-*`, `via-white`, `to-*`)
 *   - the `ring-1` edge, which becomes a faint white line
 *   - the chip fill and its label
 *
 * The glow watermark is deliberately left alone. It is already a light
 * 200-weight shade, which is what reads as a watermark against the dark
 * gradient without being repainted.
 *
 * If you add a tone, check the class names against the override block in
 * index.css -- an uncovered `from-*` or `to-*` stays near-white in dark mode.
 */
export type CardTone = 'blue' | 'amber' | 'emerald' | 'rose' | 'slate'

export type TonePalette = {
  /** Gradient fill and hairline for the card surface. */
  card: string
  /** Icon chip and any pill badge. */
  chip: string
  /** Oversized decorative watermark behind the content. */
  glow: string
  /** Interactive text, e.g. a "View breakdown" link. */
  accent: string
}

export const CARD_TONES: Record<CardTone, TonePalette> = {
  blue: {
    card: 'bg-gradient-to-br from-blue-50 via-white to-blue-100/70 ring-1 ring-blue-100',
    chip: 'bg-blue-100/80 text-blue-700',
    glow: 'text-blue-200/50',
    accent: 'text-blue-600',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 via-white to-orange-100/70 ring-1 ring-amber-100',
    chip: 'bg-amber-100/80 text-amber-700',
    glow: 'text-orange-200/60',
    accent: 'text-amber-600',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 ring-1 ring-emerald-100',
    chip: 'bg-emerald-100/80 text-emerald-700',
    glow: 'text-emerald-200/50',
    accent: 'text-emerald-600',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/70 ring-1 ring-rose-100',
    chip: 'bg-rose-100/80 text-rose-700',
    glow: 'text-rose-200/50',
    accent: 'text-rose-600',
  },
  slate: {
    card: 'bg-gradient-to-br from-slate-100 via-white to-slate-200/70 ring-1 ring-slate-200',
    chip: 'bg-slate-200/80 text-slate-700',
    glow: 'text-slate-300/60',
    accent: 'text-slate-600',
  },
}

/**
 * Stat card used across the top of the expenses, settlement and categories
 * pages. Same visual language as the group page's SummaryCard -- gradient
 * surface, tinted icon chip, watermark -- at a size suited to a row of four.
 */
export function StatCard({
  icon,
  label,
  value,
  caption,
  tone = 'slate',
  format = 'currency',
  signed = false,
  valueClassName = 'text-slate-900',
  className,
  style,
}: {
  icon?: ReactNode
  label: string
  value: number
  caption: string
  tone?: CardTone
  format?: 'currency' | 'number'
  /** Prefixes a "+" to positive values, for cards about money coming in. */
  signed?: boolean
  valueClassName?: string
  /** Lets callers opt into the shared entrance animation and stagger. */
  className?: string
  style?: CSSProperties
}) {
  const palette = CARD_TONES[tone]

  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: format === 'currency' ? 2 : 0,
    maximumFractionDigits: format === 'currency' ? 2 : 0,
  })

  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded-[28px] border-none shadow-sm p-6 flex flex-col justify-between min-h-[176px] ${palette.card} ${className ?? ''}`}
    >
      {icon && (
        <div
          className={`absolute -right-5 -bottom-7 pointer-events-none opacity-60 ${palette.glow}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${palette.chip}`}
            >
              {icon}
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
            {label}
          </span>
        </div>

        <p
          className={`mt-4 text-3xl font-extrabold tracking-tight truncate ${valueClassName}`}
        >
          {signed && value > 0 && (
            <span className="text-slate-400">+</span>
          )}
          {format === 'currency' ? '$' : ''}
          {formatted}
        </p>
      </div>

      <p className="relative mt-4 text-xs font-medium text-slate-600">{caption}</p>
    </div>
  )
}
