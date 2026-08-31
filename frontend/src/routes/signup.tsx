import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { createFileRoute,redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
   beforeLoad: ({ context, location }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-screen items-center justify-center">
      <SignUpForm />
    </main>
  );
}
