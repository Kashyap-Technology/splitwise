import { Button } from '@/components/ui/button'
import { createFileRoute,Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
return(
<nav className="border-b">
  <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
    <Link to="/" className="text-lg font-semibold text-primary">
          Splitsy
        </Link>
  <div className="ml-auto flex items-center gap-8">
        <Link to='/features' className="text-sm font-medium text-muted-foreground hover:text-primary">Features</Link>
    <Link to='/howitworks' className="text-sm font-medium text-muted-foreground hover:text-primary">How it Works</Link>
    <Link to='/pricing' className="text-sm font-medium text-muted-foreground hover:text-primary">Pricing</Link>
  </div>
  <div className="ml-auto flex items-center gap-3">
    <Button variant="outline" size="sm">
      Sign In
    </Button>
    <Button size="sm">Sign Up</Button>
  </div>
  </div>
</nav>
)
}
