import { useEffect, useRef } from 'react'
import { RouterProvider, useRouter } from '@tanstack/react-router'
import { router } from './router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ToastProvider } from '@/components/Toast'

function InnerApp() {
  const auth = useAuth()
  const wasAuthenticated = useRef(auth.isAuthenticated)

  useEffect(() => {
    if (wasAuthenticated.current && !auth.isAuthenticated) {
      router.navigate({ to: '/login', replace: true })
    }
    wasAuthenticated.current = auth.isAuthenticated
  }, [auth.isAuthenticated])

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-600 font-medium text-sm">
        Loading session...
      </div>
    )
  }

  // ToastProvider wraps the router so auth and data hooks can raise toasts
  // from anywhere in the tree, including route guards.
  return (
    <ToastProvider>
      <RouterProvider router={router} context={{ auth }} />
    </ToastProvider>
  )
}

export default function App() {
  return <InnerApp />
}
