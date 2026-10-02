import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, FileJson, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { api } from '@/api/client'
import type { UserExport } from '@/features/user/types/export.types'

export const Route = createFileRoute('/_authenticated/report')({
  component: ReportPage,
})

const money = (value: string | number) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const net = (group: UserExport['groups'][number]) =>
  group.expenses.reduce((sum, expense) => sum + Number(expense.your_paid), 0) -
  group.expenses.reduce((sum, expense) => sum + Number(expense.your_share), 0)

function ReportPage() {
  const [data, setData] = useState<UserExport | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetched once on mount. A report is a snapshot, so this deliberately
  // bypasses react-query and does not refetch on window focus.
  useEffect(() => {
    let cancelled = false

    api
      .get<UserExport>('/users/export/')
      .then((response) => {
        if (!cancelled) setData(response.data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your data. Please try again.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const downloadJson = () => {
    if (!data) return

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'splitsy-export.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const netValue = useMemo(
    () => (data ? Number(data.totals.your_net) : 0),
    [data],
  )

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 print:p-0 print:max-w-none">
      {/* Screen-only toolbar. Hidden when printing. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button
          render={<Link to="/me" />}
          variant="ghost"
          className="rounded-xl gap-2 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={downloadJson}
            disabled={!data}
            className="rounded-xl gap-2 font-semibold"
          >
            <FileJson className="w-4 h-4" />
            Download JSON
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Printer className="w-4 h-4" />
            Save as PDF
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-500 print:hidden">
        This page is laid out for printing — use <strong>Save as PDF</strong> and your
        browser produces a clean document. The JSON download is the raw data.
      </p>

      {error ? (
        <Card className="border-l-4 border-l-red-400 rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="font-semibold text-slate-800">{error}</p>
          </CardContent>
        </Card>
      ) : !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <article className="space-y-6">
          <header className="border-b border-slate-200 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Splitsy · Expense Report
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {data.account.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {data.account.email}
              {data.account.created_at && ` · member since ${date(data.account.created_at)}`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Generated {date(data.exported_at)}
            </p>
          </header>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Figure label="Groups" value={String(data.totals.groups)} />
            <Figure label="Expenses" value={String(data.totals.expenses)} />
            <Figure label="Settlements" value={String(data.totals.settlements)} />
            <Figure
              label="Your net"
              value={`${netValue > 0 ? '+' : netValue < 0 ? '-' : ''}$${money(Math.abs(netValue))}`}
              tone={netValue > 0 ? 'emerald' : netValue < 0 ? 'rose' : 'slate'}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">At a glance</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-sm">
              <Row label="Total group spend" value={`$${money(data.totals.gross_expense_total)}`} />
              <Row label="You paid" value={`$${money(data.totals.your_total_paid)}`} />
              <Row label="Your share" value={`$${money(data.totals.your_total_share)}`} />
            </dl>
          </section>

          {data.groups.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              You are not a member of any groups, so there is nothing to report yet.
            </section>
          ) : (
            data.groups.map((group) => (
              <section key={group.id} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-1.5">
                  <h2 className="font-bold text-slate-900">{group.name}</h2>
                  <span
                    className={`text-sm font-bold ${
                      net(group) > 0
                        ? 'text-emerald-600'
                        : net(group) < 0
                          ? 'text-rose-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {net(group) === 0 ? 'Settled' : `$${money(Math.abs(net(group)))}`}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  {group.members.map((member) => member.name).join(', ')}
                  {group.your_role && ` · your role: ${group.your_role}`}
                </p>

                {group.expenses.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
                        <th className="py-1.5 pr-2 font-bold">Date</th>
                        <th className="py-1.5 pr-2 font-bold">Expense</th>
                        <th className="py-1.5 pr-2 font-bold">Category</th>
                        <th className="py-1.5 pr-2 text-right font-bold">Paid by</th>
                        <th className="py-1.5 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="py-1.5 pr-2 text-xs text-slate-500 whitespace-nowrap">
                            {date(expense.created_at)}
                          </td>
                          <td className="py-1.5 pr-2 font-medium text-slate-800">
                            {expense.title}
                          </td>
                          <td className="py-1.5 pr-2 text-xs text-slate-500">
                            {expense.category}
                          </td>
                          <td className="py-1.5 pr-2 text-xs text-slate-500 text-right">
                            {expense.payers.map((payer) => payer.name).join(', ')}
                          </td>
                          <td className="py-1.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                            ${money(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {group.settlements.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
                      Settlements
                    </h3>
                    <ul className="space-y-1">
                      {group.settlements.map((settlement) => (
                        <li key={settlement.id} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {settlement.from} → {settlement.to}
                            <span className="ml-2 text-xs text-slate-400">
                              {date(settlement.created_at)}
                            </span>
                          </span>
                          <span className="font-semibold text-slate-900">
                            ${money(settlement.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))
          )}

          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
            Generated by Splitsy. Other members are listed by name only; their email
            addresses are not part of your data.
          </footer>
        </article>
      )}
    </div>
  )
}

function Figure({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: 'slate' | 'emerald' | 'rose'
}) {
  const accent = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
  }[tone]

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-extrabold tracking-tight ${accent}`}>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
                      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  )
}