import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Check, X, Users, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useAcceptInviteMutation } from '@/features/group/api/useAcceptInviteMutation'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mutate: acceptInvite, isPending } = useAcceptInviteMutation()

  const handleAccept = () => {
    setError(null)
    acceptInvite(token, {
      onSuccess: () => {
        setAccepted(true)
        setTimeout(() => {
          navigate({ to: '/dashboard' })
        }, 2000)
      },
      onError: (err: any) => {
        const message =
          err?.response?.data?.message || 'Unable to accept invitation. Please try again.'
        setError(message)
      },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-blue-600">Splitsy</span>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {accepted ? 'Welcome to the Group!' : "You're Invited!"}
            </h1>
            <p className="text-slate-500 mt-2">
              {accepted
                ? 'You have successfully joined the group.'
                : 'Someone has invited you to join a group on Splitsy.'}
            </p>
          </CardHeader>

          <CardContent className="pb-2">
            {accepted ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-slate-600 text-center">
                  Redirecting to your dashboard...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-600 text-center text-sm">{error}</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Platform</span>
                    <span className="font-medium text-slate-900">Splitsy</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Action</span>
                    <span className="font-medium text-slate-900">Join Group</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            {!accepted && !error && (
              <>
                <Button
                  onClick={handleAccept}
                  disabled={isPending}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isPending ? 'Accepting...' : 'Accept Invitation'}
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  By accepting, you'll be able to view and add expenses to this group.
                </p>
              </>
            )}
            {error && (
              <Button
                onClick={handleAccept}
                disabled={isPending}
                variant="outline"
                className="w-full h-11"
              >
                {isPending ? 'Retrying...' : 'Try Again'}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Splitsy — Split expenses with friends, effortlessly.
        </p>
      </div>
    </div>
  )
}
