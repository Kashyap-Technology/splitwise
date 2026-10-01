import { Plus, UserPlus, SquarePen,Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const getInitials = (name: string) =>
  (name || 'G')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export function GroupHeader({
  name,
  description,
  groupImageUrl,
  onEditGroup,
  onAddExpense,
  onDeleteGroup,
  onAddMember,
  canManage = false,
}: {
  name: string
  description: string
  groupImageUrl?: string | null
  onEditGroup: () => void
  onDeleteGroup: () => void
  onAddExpense: () => void
  onAddMember: () => void
  /** Admin-only actions (edit, delete) are hidden for plain members. */
  canManage?: boolean
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-cyan-400/20 blur-xl" />
          <Avatar className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-[1.4rem] border-4 border-white bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg ring-1 ring-slate-200">
            {groupImageUrl ? (
              <AvatarImage src={groupImageUrl} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-blue-100 via-indigo-50 to-sky-50 text-lg font-bold tracking-wide text-blue-700 sm:text-xl">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Group
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {name}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500 line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Edit and delete are admin-only server-side. Showing them to plain
            members offered actions that could only ever fail with a 403. */}
        {canManage && (
          <Button
            variant="link"
            onClick={onEditGroup}
            className="rounded-full px-4 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium shadow-sm transition-colors cursor-pointer"
          >
            <SquarePen className="w-4 h-4 text-slate-500" />
            <span>Edit Group</span>
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onAddMember}
          className="rounded-full px-4 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-slate-500" />
          <span>Add Members</span>
        </Button>

        <Button
          onClick={onAddExpense}
          className="rounded-full px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
{canManage && (
          <Button
            onClick={onDeleteGroup}
            className="rounded-full px-5 h-10 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Trash className="w-4 h-4" />
            <span className="font-bold">Delete Group</span>
          </Button>
        )}
      </div>
    </div>
  )
}