;
import { useNavigate } from "@tanstack/react-router";
import { SignUpFormValues } from "../schemas/signUpSchema";
import { api } from "@/api/client";
import { LoginResponse, SignUpResponse } from "../types/auth.types";
import { LoginFormValues } from "../schemas/loginSchema";
import { useMutationWithToast } from "@/lib/useMutationWithToast"

async function signUpApi(formData: FormData) {
  const response = await api.post<SignUpResponse>("/users/register/", formData);
  return response.data;
}

export function useSignUpMutation() {
  const navigate = useNavigate();

  return useMutationWithToast({
    success: 'Account created',
    mutationFn: signUpApi,
    onSuccess: (data) => {
      console.log("User Registered:", data.user);
      navigate({ to: "/login" });
    },
  });
}
