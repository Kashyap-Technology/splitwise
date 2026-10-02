import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Check,
  Download,
  FileJson,
  FileText,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { api } from '@/api/client'
import type { UserExport } from '@/features/user/types/export.types'

/**
 * Download the signed-in user's data.
 *
 * Two formats, because they answer different questions:
 *
 *  - **JSON** is the data. Lossless and addressable, and the thing to keep as a
 *    backup.
 *  - **Report** is for a human. A printable page your browser saves as PDF.
 *
 * A CSV option was built and dropped. An expense has many payers and many
 * participants, so a spreadsheet column can only collapse them into one cell,
 * which is fine to read and impossible to parse back.
 *
 * Goes through the shared axios client rather than a bare `fetch` on a relative
 * path. `fetch('/users/export/')` resolves against the app origin, not the API
 * origin, so in development it hits Vite's SPA fallback -- which answers 200
 * with index.html -- and the download becomes an HTML file named `.json`.
 */
export function DataExportCard() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const downloadJson = async () => {
    setPending(true)
    setError(null)
    setDone(false)

    try {
      const response = await api.get<UserExport>('/users/export/')

      // Guards the exact failure this replaced: anything that is not the export
      // payload must not be written to a file called `.json`.
      if (!response.data || typeof response.data !== 'object' || !response.data.account) {
        setError('The server returned an unexpected response. Please try again.')
        return
      }

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = 'splitwise-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Release the object URL once the browser has taken the download.
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (cause) {
      const status = (cause as { response?: { status?: number } })?.response?.status

      setError(
        status === 401 || status === 403
          ? 'Your session expired. Sign in again and retry.'
          : 'Export failed. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div className="border-b pb-4">
          <h3 className="text-base font-semibold text-slate-900">Your data</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Everything Splitwise holds for you: your profile, and every group you belong
            to with its expenses and settlements.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileJson className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold text-slate-900">JSON · raw data</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3">
              Complete and lossless. Every payer and participant stays a separate
              entry, so this is the one to keep as a backup.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={downloadJson}
              disabled={pending}
              className="w-full rounded-xl gap-2 font-semibold"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing...
                </>
              ) : done ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Downloaded
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold text-slate-900">Report · PDF</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3">
              A printable summary of every group and expense. Opens a laid-out page
              you can save as PDF straight from your browser.
            </p>

            <Button
              render={<Link to="/report" />}
              variant="outline"
              className="w-full rounded-xl gap-2 font-semibold"
            >
              <FileText className="w-4 h-4" />
              Open report
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Covers groups you are a member of. Other members appear by name only —
            their email addresses are not part of your data and are not included.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-600 font-medium">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}