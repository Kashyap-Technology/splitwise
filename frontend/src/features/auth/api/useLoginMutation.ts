import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { flushSync } from "react-dom";

import { api } from "@/api/client";
import { LoginFormValues } from "../schemas/loginSchema";
import { LoginResponse } from "../types/auth.types";

async function loginApi(credentials: LoginFormValues) {
  const response = await api.post<LoginResponse>("/users/login/", credentials);
  return response.data;
}

export function useLoginMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      const trueUserData = data?.user || data;

      // The fix for "I have to click Sign in twice".
      //
      // `RouterProvider` only pushes fresh props into the router during a React
      // render -- it calls `router.update({ ...rest, context })` in the
      // component body. `setQueryData` merely *schedules* that render, so a
      // `navigate()` on the next line reads the pre-login context, where
      // `isAuthenticated` is still false. The `_authenticated` guard then bounces
      // the user back to /login, `login.tsx`'s guard bounces them to /dashboard,
      // and the browser ping-pongs between the two -- settling on
      // `/dashboard?redirect=%2Flogin` with the login form still on screen.
      //
      // `flushSync` forces the re-render to happen now, so the router context
      // holds the authenticated user before any guard runs.
      flushSync(() => {
        queryClient.setQueryData(["me"], trueUserData);
      });

      // `replace` so the login URL does not sit in history behind the
      // dashboard -- pressing Back should not return you to a form you have
      // already submitted successfully.
      await router.navigate({ to: "/dashboard", replace: true, search: {} });
    },
  });
}
