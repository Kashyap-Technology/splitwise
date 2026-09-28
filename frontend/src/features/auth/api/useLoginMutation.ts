import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LoginFormValues } from "../schemas/loginSchema";
import { api } from "@/api/client";
import { LoginResponse } from "../types/auth.types";

async function loginApi(credentials: LoginFormValues) {
  const response = await api.post<LoginResponse>("/users/login/", credentials);
  return response.data;
}

export function useLoginMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      console.log("Logged in user:", data.user);
      navigate({ to: "/" });
    },
  });
}
