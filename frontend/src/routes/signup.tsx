import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-screen items-center justify-center">
      <SignUpForm />
    </main>
  );
}
