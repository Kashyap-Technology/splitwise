import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // placeholder — real value supplied per-render by RouterProvider
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}