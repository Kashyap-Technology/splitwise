import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, LoginFormValues } from "../schemas/loginSchema";
import { useLoginMutation } from "../api/useLoginMutation";

export function LoginForm() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useLoginMutation();

  //setup React Hook Form
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      // rememberMe: false
    },
  });

  //form submission logic
  const onSubmit = async (data: LoginFormValues) => {
    mutate(data)
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle className="text-primary text-center text-4xl font-bold">
          Splitwise
        </CardTitle>
      </CardHeader>
      <CardDescription className="text-sm text-center text-black/80 font-regular ">
        Welcome back. Please enter your details.
      </CardDescription>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* API ERROR ALERT */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-center text-xs font-medium text-red-600 border border-red-200">
              {error.message || "Invalid email or password. Please try again."}
            </div>
          )}

          {/* email field */}
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel>Email</FieldLabel>
                <Input
                  placeholder="samyam@example.com"
                  type="email"
                  {...field}
                  disabled={isPending}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          {/* password field */}
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel>Password</FieldLabel>
                <Input
                  placeholder="••••••••"
                  type="password"
                  {...field}
                  disabled={isPending}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          {/* remember me and forgot password */}

          <Button
            type="submit"
            className="w-full cursor-pointer"
            onClick={() => onSubmit}
            disabled={isPending}
          >
            {isPending ? "Signing in ..." : "Sign In"}
          </Button>
          <div className="text-center text-xs text-gray-500 mt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary">
              Sign Up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
