import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { useToast } from "@/components/Toast";
import { api } from "@/api/client";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { LoginFormValues } from "../schemas/loginSchema";
import { LoginResponse } from "../types/auth.types";

async function loginApi(credentials: LoginFormValues) {
  const response = await api.post<LoginResponse>("/users/login/", credentials);
  return response.data;
}

/**
 * Let React Query's observer notifications drain.
 *
 * This is the whole fix for "I have to click Sign in twice".
 *
 * `queryClient.setQueryData` does not notify its observers synchronously. React
 * Query queues the notification and runs it through `notifyManager`, whose
 * default scheduler is `setTimeout(0)` -- a macrotask. Only after that does
 * `useAuth` re-render, `App` re-render, `RouterProvider` call
 * `router.update({ context })`, and the router context hold the authenticated
 * user.
 *
 * A previous attempt used `flushSync`, which cannot help: `flushSync` flushes
 * *React renders*, and no React render has been scheduled yet, because the
 * notification that would schedule it is sitting in a timer queue.
 *
 * So `navigate()` has to wait for at least one macrotask. The extra
 * `requestAnimationFrame` covers the commit that React performs synchronously
 * once it has been notified.
 */
function afterNotification(fn: () => void) {
  setTimeout(() => {
    requestAnimationFrame(fn)
  }, 0)
}

export function useLoginMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      const trueUserData = data?.user || data;

      queryClient.setQueryData(["me"], trueUserData);

      afterNotification(() => {
        toast.success("Signed in", "Taking you to your dashboard…");
        // `replace` so Back does not return to a form already submitted.
        router.navigate({ to: "/dashboard", replace: true });
      });
    },
    onError: (error) => {
      // `getErrorMessage` reads the API's own message, so a wrong password
      // says so instead of "Request failed with status code 401".
      toast.error("Could not sign you in", getErrorMessage(error));
    },
  });
}