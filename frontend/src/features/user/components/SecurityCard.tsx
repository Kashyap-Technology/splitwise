import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { KeyRound, ShieldCheck } from "lucide-react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePasswordChangeMutation } from "@/features/user/api/usePasswordChangeMutation";

const schema = z
  .object({
    oldPassword: z.string().min(1, { message: "Enter your current password" }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string().min(1, { message: "Confirm your new password" }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.oldPassword !== v.newPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });

type Values = z.infer<typeof schema>;

/**
 * Change password while signed in. Separate from the emailed reset flow on
 * purpose: this proves ownership with the current password and works
 * immediately, whereas "forgot password" needs access to the inbox and leaves
 * the user signed out.
 */
export function SecurityCard() {
  const { mutate, isPending, error } = usePasswordChangeMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (values: Values) => {
    mutate(values, {
      // Clear the fields so the old password is not left sitting in the DOM.
      // Success is announced by the toast the mutation raises.
      onSuccess: () => reset(),
    });
  };

  const busy = isPending || isSubmitting;

  return (
    <Card className="border-slate-100 shadow-sm overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Password</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change the password you use to sign in.
              </p>
            </div>
          </div>
          <Button
            render={<Link to="/forgot-password" />}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground shrink-0"
          >
            Forgot it?
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-center text-xs font-medium text-red-600 border border-red-200">
            {error.message || "Could not update your password."}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="oldPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Current password
                </FieldLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...field}
                  disabled={busy}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              control={control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    New password
                  </FieldLabel>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                    disabled={busy}
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
                  <FieldLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Confirm
                  </FieldLabel>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                    disabled={busy}
                  />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            At least 8 characters, and not your email or name.
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
            {busy ? "Updating ..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
