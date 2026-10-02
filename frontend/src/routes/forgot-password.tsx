import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/features/auth/schemas/passwordResetSchema";
import { useForgotPasswordMutation } from "@/features/auth/api/usePasswordResetMutation";

// No authenticated-redirect here, unlike /login. Being signed in is not a
// reason to refuse a password reset: someone who forgot their password may well
// still have a live session on another tab, and bouncing them to the dashboard
// is the opposite of what they asked for. /me has a change-password card for
// people who are already able to sign in.
export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  // Set once submitted, and never unset. Until then any address is plausible,
  // so there is no honest success state to show per-address.
  const [sent, setSent] = useState(false);
  const { mutate, isPending } = useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    getValues,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ForgotPasswordValues) => {
    mutate(values, { onSuccess: () => setSent(true) });
  };

  return (
    <main className="mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Reset your password
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {sent
              ? "Check your inbox for the next step."
              : "Enter your email and we'll send you a link to choose a new one."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700">
                <MailCheck className="h-5 w-5 mb-2" />
                <p className="font-semibold">
                  If an account exists for {getValues("email")}, a reset link is on
                  its way.
                </p>
                <p className="mt-1 text-emerald-600">
                  The link expires in 24 hours and can be used once.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Nothing after a few minutes? Check spam, then make sure you used the
                same address you signed up with.
              </p>

              <div className="flex flex-col gap-2">
                <Button render={<Link to="/login" />} variant="outline" className="w-full">
                  Back to sign in
                </Button>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs text-muted-foreground hover:text-slate-900 transition-colors"
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      placeholder="samyam@example.com"
                      type="email"
                      autoComplete="email"
                      {...field}
                      disabled={isPending}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Sending ..." : "Send reset link"}
              </Button>

              <Button
                render={<Link to="/login" />}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
