import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Equal, Plus, RefreshCw, Users, Utensils, Split, Wallet, Wand ,Lock} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        {/* Change max-w-7xl mx-auto to w-full if you want the logo on the physical screen edge */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-blue-600">
            <Equal className="h-6 w-6 stroke-[3]" />
            <span>Splitsy</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link to="/howitworks" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button size='lg' variant="ghost" className="cursor-pointer" render={<Link to='/login'>Login</Link>}/>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer px-5" render={<Link to='/signup'>Sign Up</Link>}/>
              
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col items-start gap-6 max-w-xl">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl leading-[1.1]">
                Split expenses, <br />
                <span className="text-blue-600">not friendships.</span>
              </h1>
              <p className="text-md text-muted-foreground leading-relaxed">
                The easiest way to share bills and IOUs with friends and roommates. Keep track of who owes who with zero friction and total transparency.
              </p>
              <div className="flex items-center gap-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="cursor-pointer">
                  See Demo
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="absolute -inset-4 rounded-full bg-blue-400/20 blur-3xl -z-10" />
              <Card className="w-full max-w-md shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Utensils className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Dinner at Mario's</h3>
                        <p className="text-xs text-muted-foreground">Added by Sarah • Today</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-foreground">$124.50</span>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                        <span className="font-medium text-foreground">You owe</span>
                      </div>
                      <span className="font-bold text-red-500">$41.50</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-1/3 rounded-full bg-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 border-t bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">How it Works</h2>
              <p className="text-muted-foreground text-lg">
                Three simple steps to financial harmony with your group.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">1. Add Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    Quickly input bills, groceries, or rent. Assign categories and dates to keep everything organized.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">2. Split with Friends</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    Choose who was involved. Split equally, by percentages, or exact amounts depending on the situation.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">3. Settle Up</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    See clearly who owes what. Record payments instantly when debts are cleared to keep balances accurate.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Powerful Features Section */}
        <section className="py-20 border-t">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Powerful Features.
              </h2>
              <p className="text-md text-muted-foreground">
                Everything you need to manage shared finances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-sm p-5">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white">
                    <Split className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Simplified Group Splitting</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    Quickly split any bill with multiple friends. Our intuitive interface makes complex math a thing of the past.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Real-time Activity Feed</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    See updates instantly when someone adds
                    an expense, comments, or settles up with the
                    group.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white">
                    <Wand className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">Smart Debt Simplification</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    Our algorithm minimizes total transactions. If
                    A owes B and B owes C, we calculate the
                    most efficient way to settle up.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
            <div className='mt-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#021330] to-[#012d70] p-8 md:p-10 text-white shadow-xl'>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
<div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-300 ring-1 ring-inset ring-white/15" />
<Lock className='h-4 w-4'/>
              </div>
              
            </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}