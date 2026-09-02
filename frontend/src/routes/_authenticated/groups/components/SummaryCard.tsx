import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export function SummaryCard({
  icon,
  label,
  value,
  meta,
  actionLabel,
  valueClassName = 'text-slate-900',
  prefixText,
  rightIcon,
  onAction,
}: {
  icon: ReactNode
  label: string
  value: number
  meta: string
  actionLabel: string
  valueClassName?: string
  prefixText?: string
  rightIcon?: ReactNode
  onAction?: () => void
}) {
  // Format number and split integer and decimal portions for visual styling
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const [integerPart, decimalPart] = formatted.split('.')

  return (
    <Card className="rounded-[28px] border-none shadow-none bg-[#ECEEF6] p-6 flex flex-col justify-between relative overflow-hidden min-h-[190px]">
      <div>
        {/* Header Label */}
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
          <span className="text-slate-700">{icon}</span>
          <span>{label}</span>
        </div>

        {/* Amount & Prefix */}
        <div className="mt-4">
          {prefixText && (
            <span className="block text-base font-semibold text-slate-500 mb-0.5">
              {prefixText}
            </span>
          )}

          <div className={`flex items-baseline font-extrabold tracking-tight ${valueClassName}`}>
            <span className="text-4xl md:text-[42px] leading-none">${integerPart}</span>
            <span className="text-2xl font-bold opacity-60">.{decimalPart}</span>
          </div>
        </div>
      </div>

      {/* Decorative Right Icon Watermark */}
      {rightIcon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 text-orange-400">
          {rightIcon}
        </div>
      )}

      {/* Footer Meta & Action */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/70 text-xs">
        <span className="text-slate-400 font-medium">{meta}</span>
        <button
          onClick={onAction}
          className="text-[#2547EB] font-bold hover:underline transition-all"
        >
          {actionLabel}
        </button>
      </div>
    </Card>
  )
}