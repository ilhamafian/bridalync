import { z } from "zod";

export const signupPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must include a special character"
  );

export const sendVerificationCodeRequestSchema = z.object({
  email: z.email(),
});

export type SendVerificationCodeRequest = z.infer<
  typeof sendVerificationCodeRequestSchema
>;

export const signupRequestSchema = z.object({
  email: z.email(),
  password: signupPasswordSchema,
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
