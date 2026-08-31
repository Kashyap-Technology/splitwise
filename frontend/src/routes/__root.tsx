import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

export interface AuthContext {
  user: { id: string; email: string } | null
  isAuthenticated: boolean
  isLoading:boolean
}

export const Route = createRootRouteWithContext<{ auth: AuthContext }>()({
  component: () => <Outlet />
})