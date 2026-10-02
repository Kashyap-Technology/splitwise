import { useMutation } from "@tanstack/react-query";

import { api } from "@/api/client";
import type {
  ForgotPasswordValues,
  ResetPasswordValues,
} from "../schemas/passwordResetSchema";

async function forgotPasswordApi(values: ForgotPasswordValues) {
  const response = await api.post("/users/password/forgot/", values);
  return response.data as { message: string };
}

async function resetPasswordApi(values: ResetPasswordValues & {
  uid: string;
  token: string;
}) {
  const response = await api.post("/users/password/reset/confirm/", {
    uid: values.uid,
    token: values.token,
    new_password: values.newPassword,
    confirm_password: values.confirmPassword,
  });
  return response.data as { message: string };
}

/**
 * The backend deliberately answers identically whether or not the address is
 * registered, so a success here means "we've done what we can", not "this
 * account exists". The UI is worded to match.
 */
export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: forgotPasswordApi });
}

export function useResetPasswordMutation() {
  return useMutation({ mutationFn: resetPasswordApi });
}
