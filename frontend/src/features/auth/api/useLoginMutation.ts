import {useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate,useRouter } from "@tanstack/react-router";
import { LoginFormValues } from "../schemas/loginSchema";
import { api } from "@/api/client";
import { LoginResponse } from "../types/auth.types";

async function loginApi(credentials: LoginFormValues) {
  const response = await api.post<LoginResponse>("/users/login/", credentials);
  return response.data;
}

export function useLoginMutation() {
  const router=useRouter()
  const navigate = useNavigate();
  const queryClient=useQueryClient()

  return useMutation({
    mutationFn: loginApi,
    onSuccess: async(data)=>{
      const trueUserData = data?.user || data;
      queryClient.setQueryData(['me'], trueUserData);
      navigate({ to: "/dashboard" });
      await router.invalidate();
    
    }
  });
}
