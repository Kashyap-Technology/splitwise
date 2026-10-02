;

import { api } from "@/api/client";
import { useMutationWithToast } from "@/lib/useMutationWithToast"

export type PasswordChangeValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

async function passwordChangeApi(values: PasswordChangeValues) {
  const response = await api.post("/users/password/change/", {
    old_password: values.oldPassword,
    new_password: values.newPassword,
  });
  return response.data as { message: string };
}

/**
 * Signed-in password change: proves ownership with the current password.
 * `confirmPassword` is deliberately not sent -- the endpoint has no such field
 * -- it exists so the form can catch a mismatch without a round trip.
 */
export function usePasswordChangeMutation() {
  return useMutationWithToast({
    success: 'Password updated', mutationFn: passwordChangeApi });
}
