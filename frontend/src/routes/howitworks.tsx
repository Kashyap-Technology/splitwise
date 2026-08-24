import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/howitworks')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/howitworks"!</div>
}
