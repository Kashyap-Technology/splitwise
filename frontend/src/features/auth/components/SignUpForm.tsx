import { Controller, useForm, useWatch } from "react-hook-form";
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
import { signUpSchema, SignUpFormValues } from "../schemas/signUpSchema";
import { useSignUpMutation } from "../api/useSignUpMutation";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Camera } from "lucide-react";

export function SignUpForm() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useSignUpMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      profile_image: undefined,
    },
  });
  const profileImage = useWatch({ control, name: "profile_image" });
  const previewUrl = useMemo(() => {
    return profileImage instanceof File
      ? URL.createObjectURL(profileImage)
      : null;
  }, [profileImage]);

  const onSubmit = async (data: SignUpFormValues) => {
    const formData: FormData = new FormData();

    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("phone", data.phone);

    if (data.profile_image) {
      formData.append("profile_image", data.profile_image);
    }
    mutate(formData);
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle className="text-primary text-center text-4xl font-bold">
          Join Splitsy
        </CardTitle>
      </CardHeader>
      <CardDescription className="text-sm text-center text-black/80 font-regular">
        Start splitting expenses seamlessly today.
      </CardDescription>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Controller
            name="profile_image"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <div className="flex flex-col items-center justify-center space-y-1">
                <label
                  htmlFor="profile_image_input"
                  className="group relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 overflow-hidden"
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <Camera className="h-5 w-5 mb-0.5 text-gray-400" />
                      <span className="text-[10px] font-medium text-gray-600">
                        Add Photo
                      </span>
                    </div>
                  )}

                  <input
                    {...field}
                    id="profile_image_input"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onChange(file);
                    }}
                  />
                </label>
                <span className="text-[11px] text-gray-400 font-normal">
                  Optional profile picture
                </span>
                {errors.profile_image && (
                  <FieldError className="text-xs text-red-500">
                    {errors.profile_image.message as string}
                  </FieldError>
                )}
              </div>
            )}
          />
          {/* name field */}
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel>Full Name</FieldLabel>
                <Input
                  placeholder="Samyam Timsina"
                  type="text"
                  {...field}
                  disabled={isPending}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />
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

          {/* phonenumber field */}
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel>Phone Number</FieldLabel>
                <Input
                  placeholder="98XXXXXXXX"
                  type="number"
                  {...field}
                  disabled={isPending}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="terms"
              className="h-4 w-4 rounded border-gray-300 text-blue"
            />
            <label
              htmlFor="terms"
              className="text-[11px] text-gray-600 leading-tight"
            >
              I agree to the{" "}
              <Link
                to="/signup"
                className="font-semibold text-blue-600 hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/signup"
                className="font-semibold text-blue-600 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            onClick={() => onSubmit}
            disabled={isPending}
          >
            {isPending ? (
              "Creating Account..."
            ) : (
              <>
                Create Account <ArrowRight />
              </>
            )}
          </Button>
          <div className="text-center text-xs text-gray-500 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-primary">
              Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
