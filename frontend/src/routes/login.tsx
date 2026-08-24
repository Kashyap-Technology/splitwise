import { Card,CardContent,CardDescription,CardHeader, CardTitle } from '@/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
return(
  <main className='mx-auto flex min-h-screen items-center justify-center'>
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle className='text-primary text-center text-4xl font-bold'>Splitsy
        </CardTitle>
          <CardDescription className="text-sm text-center text-black/80 font-regular pt-2">Welcome back. Please enter your details.</CardDescription>
        <CardContent className='space-y-6'>

          
        </CardContent>
      </CardHeader>
    </Card>
  </main>
)
}
