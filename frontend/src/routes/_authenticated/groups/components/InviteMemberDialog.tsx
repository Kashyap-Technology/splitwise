import { useState } from 'react'
import { Search, Loader2, Check, UserPlus, X } from 'lucide-react'

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserSearchQuery, type SearchedUser } from '@/features/group/api/useUserSearchQuery'

interface InviteMemberDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (user: SearchedUser) => void
  isPending?: boolean
}

export function InviteMemberDialog({
  isOpen,
  onOpenChange,
  onInvite,
  isPending = false,
}: InviteMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null)

  const { data: users = [], isLoading, isFetching } = useUserSearchQuery(searchQuery)

  const handleClose = () => {
    setSearchQuery('')
    setSelectedUser(null)
    onOpenChange(false)
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    onInvite(selectedUser)
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Invite Member
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Search for existing users by name or email address to add them to your space.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Search Bar Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 pr-8 bg-white border-slate-200 rounded-xl text-sm h-11 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Results Area */}
          <div className="min-h-[220px] max-h-[280px] overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50/50">
            {isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs">Searching users...</span>
              </div>
            ) : searchQuery.trim() === '' ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 p-4">
                <UserPlus className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs font-medium">Type a name or email above to search</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 p-4">
                <p className="text-xs font-medium">No users found for "{searchQuery}"</p>
              </div>
            ) : (
              users.map((user) => {
                const isSelected = selectedUser?.id === user.id
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-200'
                        : 'hover:bg-white hover:shadow-sm border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border shrink-0">
                        {user.profile_image_url && (
                          <AvatarImage
                            src={user.profile_image_url}
                            alt={user.name}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Action Footer */}
          <DialogFooter className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedUser || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}