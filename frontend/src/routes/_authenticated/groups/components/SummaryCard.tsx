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
}: {
  icon: ReactNode
  label: string
  value: number
  meta: string
  actionLabel: string
  valueClassName?: string
  prefixText?: string
}) {
  return (
    <Card className="rounded-3xl border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
          {icon}
          <span>{label}</span>
        </div>

        <div className="mt-3">
          {prefixText && (
            <span className="text-sm font-semibold text-slate-500">{prefixText}</span>
          )}

          <div className={`text-4xl font-extrabold mt-0.5 ${valueClassName}`}>
            ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50 text-xs">
        <span className="text-slate-500">{meta}</span>
        <button className="text-blue-600 font-semibold hover:underline">
          {actionLabel}
        </button>
      </div>
    </Card>
  )
}
