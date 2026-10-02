import {
  useMutation as useTanstackMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/getErrorMessage";

type ToastOptions = {
  /** Toast title on success, e.g. "Expense added". */
  success?: string;
  /** Optional second line under the title. */
  description?: string;
  /** Replaces the derived error text entirely. */
  error?: string;
  /** Title used when a request fails. */
  errorTitle?: string;
};

/**
 * Errors reaching this layer are axios errors in practice, and the call sites
 * read `error.response?.data` and `error.message`. Defaulting `TError` to
 * `unknown` broke both, so the default is the axios error type.
 */
type DefaultedError = import("axios").AxiosError;

/**
 * `useMutation` with a toast on every outcome.
 *
 * Ten mutation hooks across the app and every one of them was silent on
 * failure -- a rejected request just left the form sitting there with no
 * explanation. Rather than remember to add a toast to each `onSuccess` /
 * `onError` (and again in the next hook), the behaviour lives here and each
 * hook only supplies the words it wants.
 *
 * A hook that passes no messages still gets a failure toast, so nothing is ever
 * silent by accident.
 */
export function useMutationWithToast<
  TVariables = unknown,
  TData = unknown,
  TError = DefaultedError,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> &
    ToastOptions = {},
): UseMutationResult<TData, TError, TVariables, TContext> {
  const toast = useToast();
  const { success, description, error, errorTitle, ...mutationOptions } = options;

  return useTanstackMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,

    // Only wrap the handlers the caller actually supplied, so a hook that
    // already navigates or toasts keeps doing exactly that and is not
    // double-toasted.
    ...(mutationOptions.onSuccess
      ? {
          onSuccess: (data, variables, onMutateResult, context) => {
            if (success) toast.success(success, description);
            return mutationOptions.onSuccess?.(
              data,
              variables,
              onMutateResult,
              context,
            );
          },
        }
      : success
        ? {
            onSuccess: () => {
              toast.success(success, description);
            },
          }
        : {}),

    onError: (err, variables, onMutateResult, context) => {
      toast.error(
        errorTitle || "Something went wrong",
        error || getErrorMessage(err),
      );
      return mutationOptions.onError?.(err, variables, onMutateResult, context);
    },
  });
}