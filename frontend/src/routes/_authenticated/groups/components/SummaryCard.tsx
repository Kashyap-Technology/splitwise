import type { CSSProperties, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { CARD_TONES, type CardTone } from '@/components/StatCard'

// The palette lives in components/StatCard so this card and the plain stat
// cards on the other pages stay identical.
type SummaryTone = CardTone

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
  className,
  style,
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
  /** Lets callers opt into the shared entrance animation and stagger. */
  className?: string
  style?: CSSProperties
}) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: valueFormat === 'currency' ? 2 : 0,
    maximumFractionDigits: valueFormat === 'currency' ? 2 : 0,
  })
  const [integerPart, decimalPart] = formatted.split('.')

  const palette = CARD_TONES[tone]

  return (
    <Card
      style={style}
      className={`rounded-[28px] border-none shadow-sm p-6 flex flex-col justify-between relative overflow-hidden min-h-[210px] ${palette.card} ${className ?? ''}`}
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