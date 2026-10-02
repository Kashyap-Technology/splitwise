import { createFileRoute, redirect, Outlet, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Zap, Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // automatically close the mobile sheet drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white">
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar />
      </div>

      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-blue-600">Splitwise</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="w-6 h-6 text-slate-700" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-64 border-r border-slate-200 bg-white">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}