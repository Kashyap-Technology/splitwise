import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

type SummaryTone = 'blue' | 'amber' | 'emerald' | 'slate'

// Each tone gets its own tinted gradient so the cards read as distinct
// summaries at a glance instead of two identical grey panels.
const TONES: Record<
  SummaryTone,
  { card: string; chip: string; glow: string; accent: string }
> = {
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
  slate: {
    card: 'bg-gradient-to-br from-slate-100 via-white to-slate-200/70 ring-1 ring-slate-200',
    chip: 'bg-slate-200/80 text-slate-700',
    glow: 'text-slate-300/60',
    accent: 'text-slate-600',
  },
}

export function SummaryCard({
  icon,
  label,
  value,
  meta,
  actionLabel,
  valueClassName = 'text-slate-900',
  prefixText,
  onAction,
  tone = 'slate',
  badge,
  valueFormat = 'currency',
}: {
  icon: ReactNode
  label: string
  value: number
  meta: string
  actionLabel?: string
  valueClassName?: string
  prefixText?: string
  onAction?: () => void
  tone?: SummaryTone
  badge?: string
  valueFormat?: 'currency' | 'number'
}) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: valueFormat === 'currency' ? 2 : 0,
    maximumFractionDigits: valueFormat === 'currency' ? 2 : 0,
  })
  const [integerPart, decimalPart] = formatted.split('.')

  const palette = TONES[tone]

  return (
    <Card
      className={`rounded-[28px] border-none shadow-sm p-6 flex flex-col justify-between relative overflow-hidden min-h-[210px] ${palette.card}`}
    >
      {/* Decorative watermark */}
      <div
        className={`absolute -right-6 -bottom-8 pointer-events-none opacity-60 ${palette.glow}`}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="relative">
        {/* Header Label */}
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${palette.chip}`}
          >
            {icon}
          </span>
          <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
            {label}
          </span>
        </div>

        {badge && (
          <span
            className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${palette.chip}`}
          >
            {badge}
          </span>
        )}

        {/* Amount & Prefix */}
        <div className="mt-4">
          {prefixText && (
            <span className="block text-lg font-bold text-slate-600 mb-1">
              {prefixText}
            </span>
          )}

          <div
            className={`flex items-baseline font-extrabold tracking-tight ${valueClassName}`}
          >
            {valueFormat === 'currency' ? (
              <>
                <span className="text-5xl md:text-[56px] leading-none">${integerPart}</span>
                <span className="text-3xl font-bold opacity-60">.{decimalPart}</span>
              </>
            ) : (
              <span className="text-5xl md:text-[56px] leading-none">{integerPart}</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Meta & Action */}
      <div className="relative flex items-center justify-between mt-6 pt-4 border-t border-slate-200/70">
        <span className="text-sm font-semibold text-slate-600">{meta}</span>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className={`text-sm font-bold hover:underline transition-all ${palette.accent}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </Card>
  )
}