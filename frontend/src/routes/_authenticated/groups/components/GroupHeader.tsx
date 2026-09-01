import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function GroupHeader({
  name,
  description,
  onAddExpense,
}: {
  name: string
  description: string
  onAddExpense: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <Button
        onClick={onAddExpense}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 h-11 flex items-center gap-2 font-medium shadow-sm shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>Add Expense</span>
      </Button>
    </div>
  )
}
