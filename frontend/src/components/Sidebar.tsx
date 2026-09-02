import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Receipt,
  UserCheck,
  Grid,
  Settings,
  Zap,
  Plus,
  LogOut,
  ChevronsUpDown,
  Bell,
  CreditCard,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Groups", to: "/groups", icon: Users, badge: 3 },
  { label: "Expenses", to: "/expenses", icon: Receipt },
  { label: "Settlement", to: "/settlement", icon: UserCheck, badge: "2 Owed" },
  { label: "Categories", to: "/categories", icon: Grid },
];

const secondaryNavItems: NavItem[] = [
  { label: "Settings", to: "/settings", icon: Settings },
];

export function Sidebar({ className = "" }: { className?: string }) {
  const location = useLocation();

  return (
    <aside className={`w-64 h-full bg-white text-slate-700 flex flex-col justify-between border-r border-slate-200 select-none ${className}`}>
      
      {/* 1. Header & Workspace Switcher */}
      <div className="p-4 border-b border-slate-200">
        <DropdownMenu>
          <DropdownMenuTrigger 
            render={
              <Button
                variant="ghost"
                className="w-full justify-between px-2.5 py-6 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="font-bold text-sm text-slate-900 block">Splitsy Workspace</span>
                    <span className="text-[11px] text-slate-500 font-medium">Pro Plan</span>
                  </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              </Button>
            }
          />
          <DropdownMenuContent className="w-56 bg-white border-slate-200 text-slate-800" align="start">
            <DropdownMenuLabel className="text-slate-500 text-xs">Workspaces</DropdownMenuLabel>
            <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer font-medium">
              <Zap className="w-4 h-4 mr-2 text-blue-600" /> Splitsy Personal
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer font-medium">
              <Users className="w-4 h-4 mr-2 text-emerald-600" /> Household 4B
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer text-blue-600 font-medium">
              <Plus className="w-4 h-4 mr-2" /> Create New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Main Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        
        {/* Main Section */}
        <div>
          <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
            Menu
          </span>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <Link key={item.to} to={item.to} className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-between h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 rounded-full border-0 ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System & Preferences Section */}
        <div>
          <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
            System
          </span>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <Link key={item.to} to={item.to} className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Footer User Menu */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <DropdownMenu>
          <DropdownMenuTrigger 
            render={
              <Button
                variant="ghost"
                className="w-full justify-between px-2 py-6 hover:bg-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 ring-1 ring-slate-200">
                    <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Alex Chen" />
                    <AvatarFallback className="bg-slate-100 text-slate-700">AC</AvatarFallback>
                  </Avatar>
                  <div className="text-left leading-tight">
                    <span className="text-xs font-bold text-slate-900 block">Alex Chen</span>
                    <span className="text-[10px] text-slate-500 font-medium truncate block max-w-[110px]">
                      alex@splitsy.app
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              </Button>
            }
          />
          <DropdownMenuContent className="w-56 bg-white border-slate-200 text-slate-800" align="end" side="top">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">Alex Chen</p>
                <p className="text-xs leading-none text-slate-500">alex@splitsy.app</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                <CreditCard className="w-4 h-4 mr-2" /> Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                <Bell className="w-4 h-4 mr-2" /> Notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                <HelpCircle className="w-4 h-4 mr-2" /> Support
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem className="focus:bg-rose-50 text-rose-600 focus:text-rose-700 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </aside>
  );
}