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
      <div className="flex items-center gap-4 sm:gap-5 min-w-0">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-cyan-400/20 blur-xl" />
          {/* `after:hidden` drops Avatar's base `after:` pseudo-element, which draws a
                *circular* hairline ring on top of the photo and cannot match a
                rounded-square tile. The image carries the radius of the clip
                region itself (rounded-[1.75rem] border-box minus border-4 =
                24px) so its corners are rounded on their own rather than relying
                on the parent clip alone. */}
          <Avatar className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-[1.75rem] border-4 border-white bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg ring-1 ring-slate-200 after:hidden">
            {groupImageUrl ? (
              <AvatarImage
                src={groupImageUrl}
                alt={name}
                className="rounded-[1.5rem] object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-[1.5rem] bg-gradient-to-br from-blue-100 via-indigo-50 to-sky-50 text-xl font-bold tracking-wide text-blue-700 sm:text-2xl">
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

      {/* Wrap until `lg`: the four buttons need ~590px and the hero needs
          ~300px more, which overflows a `sm`/`md` viewport. Without `shrink-0`
          the button block can wrap onto extra rows instead of crushing the
          title column, which is shrinkable and would otherwise collapse. */}
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
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