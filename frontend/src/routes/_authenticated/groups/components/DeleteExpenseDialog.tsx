import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteExpenseDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  expenseTitle?: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteExpenseDialog({
  isOpen,
  onOpenChange,
  expenseTitle,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteExpenseDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete expense</DialogTitle>
          <DialogDescription className="pt-2 text-slate-600">
            Are you sure you want to delete{' '}
            {expenseTitle ? (
              <span className="font-semibold text-slate-900">{expenseTitle}</span>
            ) : (
              'this expense'
            )}
            ? This action cannot be undone. Everyone&apos;s balances will be
            recalculated without it.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? (
              'Deleting...'
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete expense
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}