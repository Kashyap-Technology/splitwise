import { Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GroupHeader({
  name,
  description,
  onAddExpense,
  onAddMember,
}: {
  name: string
  description: string
  onAddExpense: () => void
  onAddMember: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {name}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="outline"
          onClick={onAddMember}
          className="rounded-full px-4 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4 text-slate-500" />
          <span>Add Members</span>
        </Button>

        <Button
          onClick={onAddExpense}
          className="rounded-full px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </div>
    </div>
  )
}