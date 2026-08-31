import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuth } from "@/features/auth/hooks/useAuth";

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const auth = useAuth();

  // Block route rendering until initial session check finishes
  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>;
  }

  return <RouterProvider router={router} context={{ auth }} />;
}