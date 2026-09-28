import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/categories')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/groups/category"!</div>
}
