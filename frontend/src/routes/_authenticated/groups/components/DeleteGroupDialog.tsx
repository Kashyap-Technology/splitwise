import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteGroupDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  groupName?: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteGroupDialog({
  isOpen,
  onOpenChange,
  groupName,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteGroupDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Group</DialogTitle>
          <DialogDescription className="pt-2 text-slate-600">
            Are you sure you want to delete{' '}
            {groupName ? (
              <span className="font-semibold text-slate-900">{groupName}</span>
            ) : (
              'this group'
            )}
            ? This action cannot be undone and will permanently remove all associated expenses, settlements, and member data.
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
            {isPending ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}