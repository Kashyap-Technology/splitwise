import { createFileRoute } from '@tanstack/react-router';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  UserCheck, 
  Grid, 
  Settings, 
  Search, 
  Bell, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Utensils, 
  Plane, 
  Fuel, 
  Ticket, 
  ShoppingCart,
  TrendingUp,
  Wallet,
  Zap,
  Menu
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from '@/components/Sidebar';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});



function DashboardPage() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased">
      
         {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-slate-200/60 bg-white/60 backdrop-blur-md sticky top-0 z-20 gap-4">
          <div className="relative flex-1 max-w-xs sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
            <Input 
              type="text" 
              placeholder="Search transactions..."
              className="pl-10 bg-slate-100/70 border-0 rounded-xl text-sm focus-visible:ring-blue-500/20 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <Button variant="ghost" size="icon" className="relative rounded-xl text-slate-500">
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-sm font-bold text-slate-900 block leading-tight">Alex Chen</span>
                <span className="text-[11px] text-slate-400 font-medium">Settled Up</span>
              </div>
              <Avatar className="w-9 h-9 ring-2 ring-slate-100">
                <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Alex Chen" />
                <AvatarFallback>AC</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Grid View */}
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto w-full">
          
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            
            {/* Balance Card */}
            <Card className="bg-gradient-to-b from-blue-50/40 to-indigo-50/20 border-slate-200/70 rounded-2xl sm:rounded-[28px] shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Balance</span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-500 tracking-tight">
                      +$452.80
                    </span>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border-0">
                      <TrendingUp className="w-3.5 h-3.5" /> Overall positive
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                  <Card className="shadow-sm border-slate-100 rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">You are owed</span>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">$820.50</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0">
                        <ArrowDown className="w-4 h-4 text-emerald-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-slate-100 rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">You owe</span>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">$367.70</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-rose-100/80 flex items-center justify-center shrink-0">
                        <ArrowUp className="w-4 h-4 text-rose-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl gap-2 shadow-md shadow-blue-500/20">
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add an Expense</span>
                  </Button>
                  <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-11 rounded-xl gap-2 shadow-sm">
                    <Wallet className="w-4 h-4 text-slate-600" />
                    <span>Settle Up</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent Activity</h3>
                <Button variant="link" className="p-0 h-auto text-xs font-bold text-blue-600 hover:no-underline">View All</Button>
              </div>

              <Card className="shadow-sm border-slate-100 rounded-2xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-slate-100">
                  <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-100/70 flex items-center justify-center text-orange-600 shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">Sushi Dinner</h4>
                        <p className="text-xs text-slate-400 font-medium truncate">You paid $120.00</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-500">+$68.80</span>
                      <p className="text-[11px] text-slate-400 font-medium">Lent to Sarah</p>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/70 flex items-center justify-center text-blue-600 shrink-0">
                        <Plane className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">Weekend Getaway</h4>
                        <p className="text-xs text-slate-400 font-medium truncate">Mike paid $450.00</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-rose-500">-$158.80</span>
                      <p className="text-[11px] text-slate-400 font-medium">Borrowed from Mike</p>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100/70 flex items-center justify-center text-emerald-600 shrink-0">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">Roadtrip Gas</h4>
                        <p className="text-xs text-slate-400 font-medium truncate">You paid $45.00</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-500">+$22.50</span>
                      <p className="text-[11px] text-slate-400 font-medium">Lent to Dave</p>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100/70 flex items-center justify-center text-rose-600 shrink-0">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">Movie Tickets</h4>
                        <p className="text-xs text-slate-400 font-medium truncate">Emma paid $30.00</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-rose-500">-$15.80</span>
                      <p className="text-[11px] text-slate-400 font-medium">Borrowed from Emma</p>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-100/70 flex items-center justify-center text-purple-600 shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">Groceries</h4>
                        <p className="text-xs text-slate-400 font-medium truncate">You paid $85.40</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-500">+$42.70</span>
                      <p className="text-[11px] text-slate-400 font-medium">Lent to John</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Your Groups</h3>
              <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Card className="border-slate-100 shadow-sm rounded-2xl">
                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-11 h-11 rounded-xl">
                      <AvatarImage src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120" />
                      <AvatarFallback>A4</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 truncate">Apartment 4B</h4>
                      <span className="text-xs text-slate-400 font-medium">4 members</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Group Balance</span>
                    <span className="text-sm font-bold text-emerald-500">+$125.00</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm rounded-2xl">
                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-11 h-11 rounded-xl">
                      <AvatarImage src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=120" />
                      <AvatarFallback>TS</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 truncate">Tahoe Ski Trip</h4>
                      <span className="text-xs text-slate-400 font-medium">8 members</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Group Balance</span>
                    <span className="text-sm font-bold text-rose-500">-$45.50</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm rounded-2xl">
                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-11 h-11 rounded-xl">
                      <AvatarImage src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120" />
                      <AvatarFallback>OL</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 truncate">Office Lunches</h4>
                      <span className="text-xs text-slate-400 font-medium">3 members</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Group Balance</span>
                    <span className="text-sm font-bold text-slate-900">Settled</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}