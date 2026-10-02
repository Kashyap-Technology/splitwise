import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, KeyRound } from "lucide-react";

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
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/features/auth/schemas/passwordResetSchema";
import { useResetPasswordMutation } from "@/features/auth/api/usePasswordResetMutation";

export const Route = createFileRoute("/reset-password")({
  // Both parameters arrive from the emailed link. Coerced rather than declared,
  // because a hand-edited, truncated or scanned link can send anything here and
  // the page still has to render.
  validateSearch: (search: Record<string, unknown>) => ({
    uid: typeof search.uid === "string" ? search.uid : "",
    token: typeof search.token === "string" ? search.token : "",
  }),
  // Deliberately no authenticated-redirect, unlike /login. This page is reached
  // from an email, which people open on a different device from the one holding
  // their session -- and a live session on the same browser is no reason to
  // refuse someone the reset they just asked for.
  component: ResetPasswordPage,
});

/**
 * Pull uid/token out of the query string, falling back to the fragment.
 *
 * Link scanners in corporate mail and some webmail clients rewrite links on
 * the way through, and the query string is the part they are most likely to
 * strip -- it never reaches the scanner's own tracking parameters intact. The
 * fragment is never sent to a server, so it survives that. Accepting either
 * costs nothing and covers the mangled cases.
 */
function readResetParams(query: { uid: string; token: string }) {
  if (query.uid && query.token) return query

  const fragment = window.location.hash.replace(/^#/, "")
  if (!fragment) return query

  const fromHash = new URLSearchParams(fragment)
  return {
    uid: query.uid || fromHash.get("uid") || "",
    token: query.token || fromHash.get("token") || "",
  }
}

function ResetPasswordPage() {
  const search = Route.useSearch()
  const { uid, token } = readResetParams(search)
  const [done, setDone] = useState(false)
  const { mutate, isPending, error } = useResetPasswordMutation()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (values: ResetPasswordValues) => {
    mutate(
      { ...values, uid, token },
      { onSuccess: () => setDone(true) },
    );
  };

  // A link opened without its parameters, or with a truncated URL, cannot be
  // submitted -- the server has nothing to verify against. Say so up front
  // rather than failing on an empty form.
  if (!uid || !token) {
    const hasQuery = Boolean(search.uid || search.token)
    const partial =
      hasQuery && (search.uid || search.token) ? "part of the" : "the";

    return (
      <main className="mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Link incomplete
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              This page needs to be opened from the link in your reset email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 space-y-2">
              <p className="font-semibold">
                {hasQuery
                  ? `Your email or network rewrote the link and ${partial} address arrived without a reset token.`
                  : "The address arrived with no reset token at all."}
              </p>
              <p>
                Some mail clients rewrite links in transit and drop the last
                parameter. Requesting a fresh link usually fixes it.
              </p>
            </div>

            {/* Shown so a second report does not have to be guessed at. */}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-slate-900">
                What this page received
              </summary>
              <dl className="mt-2 space-y-1 font-mono break-all">
                <div>
                  <dt className="inline font-semibold">path: </dt>
                  <dd className="inline">{window.location.pathname}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">query: </dt>
                  <dd className="inline">
                    {window.location.search.replace("?", "") || "(none)"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">uid: </dt>
                  <dd className="inline">{search.uid || "(missing)"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">token: </dt>
                  <dd className="inline">
                    {search.token ? `${search.token.slice(0, 8)}...` : "(missing)"}
                  </dd>
                </div>
              </dl>
            </details>

            <Button render={<Link to="/forgot-password" />} className="w-full">
              Request a new link
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Choose a new password
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {done
              ? "You're all set."
              : "Pick something you don't use anywhere else."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {done ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5 mb-2" />
                <p className="font-semibold">Password updated.</p>
                <p className="mt-1 text-emerald-600">
                  This link has now been used and can't set another password.
                </p>
              </div>
              <Button render={<Link to="/login" />} className="w-full">
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-center text-xs font-medium text-red-600 border border-red-200">
                  {error.message ||
                    "This reset link is invalid or has expired."}
                </div>
              )}

              <Controller
                control={control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel>New password</FieldLabel>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                      disabled={isPending || isSubmitting}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel>Confirm new password</FieldLabel>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                      disabled={isPending || isSubmitting}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5 shrink-0" />
                At least 8 characters, and not your email or name.
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || isSubmitting}
              >
                {isPending || isSubmitting ? "Updating ..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
