import { useEffect, useRef } from 'react'
import { RouterProvider, useRouter } from '@tanstack/react-router'
import { router } from './router'
import { useAuth } from '@/features/auth/hooks/useAuth'

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

  return <RouterProvider router={router} context={{ auth }} />
}

export default function App() {
  return <InnerApp />
}