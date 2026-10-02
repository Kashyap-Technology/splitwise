/**
 * Shape of `GET /api/users/export/`.
 *
 * Mirrors `backend/apps/users/export.py`. Amounts arrive as strings because the
 * server writes them from `Decimal` and never routes them through a float --
 * parse with `Number()` for display, never `parseFloat` on a sum.
 */
export interface UserExport {
  exported_at: string
  account: {
    id: number
    name: string
    email: string
    phone: string | null
    created_at: string | null
  }
  totals: {
    groups: number
    expenses: number
    settlements: number
    gross_expense_total: string
    your_total_paid: string
    your_total_share: string
    your_net: string
  }
  groups: Array<{
    id: number
    name: string
    description: string
    created_at: string | null
    your_role: string | null
    members: Array<{ name: string; role: string }>
    expenses: Array<{
      id: number
      title: string
      amount: string
      category: string
      split_type: string
      created_at: string | null
      your_paid: string
      your_share: string
      payers: Array<{ name: string; amount: string }>
      participants: Array<{ name: string; amount: string }>
    }>
    settlements: Array<{
      id: number
      from: string
      to: string
      amount: string
      created_at: string | null
    }>
  }>
}