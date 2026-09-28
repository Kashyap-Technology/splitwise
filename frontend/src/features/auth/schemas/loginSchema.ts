import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Invalid Email Address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  // rememberMe: z.boolean().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;
