import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is Required" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  email: z.email({ message: "Invalid Email Address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  phone: z
    .string()
    .regex(/^\+?\d{7,15}$/, { message: "Please enter a valid phone number" }),
  profile_image: z
    .instanceof(File, { message: "Please select an image." })
    .refine((file) => file.size <= MAX_FILE_SIZE, "Max size is 5MB")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Unsupported format",
    ),
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;
