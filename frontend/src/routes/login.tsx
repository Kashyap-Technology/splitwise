import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { createFileRoute,redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  // `location` is no longer used here. It was only feeding a `redirect` search
  // param that nothing in the app ever read, so the URL ended up carrying
  // `?redirect=%2Flogin` for no benefit -- and it is what made the post-login
  // bounce look like a half-finished navigation.
  beforeLoad: ({ context }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-screen items-center justify-center">
      <LoginForm />
    </main>
  );
}
