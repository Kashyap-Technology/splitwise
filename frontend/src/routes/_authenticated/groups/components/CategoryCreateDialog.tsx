import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCategoryMutation } from '@/features/expense/api/useExpenseMutation'
import {
  CATEGORY_THEMES,
  CATEGORY_THEME_BY_KEY,
  categoryTheme,
} from '@/features/expense/categoryTheme'

export function CategoryCreateDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  // null means "infer from the name", which is what every pre-existing
  // category does and the safest default.
  const [icon, setIcon] = useState<string | null>(null)
  const { mutate, isPending, error, reset } = useCreateCategoryMutation()

  const preview = useMemo(() => categoryTheme(name, icon), [name, icon])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('')
      setIcon(null)
      reset()
    }
    onOpenChange(open)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    mutate(
      { name: trimmedName, icon: icon ?? undefined },
      {
        onSuccess: () => handleOpenChange(false),
      },
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create an expense category</DialogTitle>
          <DialogDescription>
            Add a category that you can assign to your expenses. Anyone in the app can
            use it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Household"
              autoFocus
              maxLength={80}
            />
            {error && (
              <p className="text-xs text-red-500">
                {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                  'Unable to create category.'}
              </p>
            )}
          </div>

          {/* The icon is optional. When it is left on Auto the theme is inferred
              from the name, which is how every existing category renders. */}
          <div className="space-y-2">
            <Label>Icon</Label>

            <div className="grid grid-cols-7 gap-1.5">
              <button
                type="button"
                onClick={() => setIcon(null)}
                aria-pressed={icon === null}
                aria-label="Choose icon automatically"
                title="Auto — inferred from the name"
                className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
                  icon === null
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="h-4 w-4" />
              </button>

              {CATEGORY_THEMES.map((theme) => {
                const Icon = theme.Icon
                const isSelected = icon === theme.key

                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => setIcon(theme.key)}
                    aria-pressed={isSelected}
                    aria-label={theme.label}
                    title={theme.label}
                    className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-slate-500">
              {icon
                ? `Using ${CATEGORY_THEME_BY_KEY[icon]?.label ?? 'a custom icon'}.`
                : 'Auto — picks an icon based on the name.'}
            </p>
          </div>

          {/* Preview so the choice is visible before the category exists. */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className={`p-2.5 rounded-xl ${preview.box}`}>
              <preview.Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {name.trim() || 'Your category'}
              </p>
              <p className="text-xs text-slate-500">Preview</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Creating...' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}