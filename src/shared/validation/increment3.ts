import { z } from "zod";

export const unitsSystemSchema = z.enum(["metric", "imperial"]);
export const animationModeSchema = z.enum(["full", "reduced", "off"]);
export const dailyStatusKindSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "skipped",
]);
export const cardVisualVariantSchema = z.enum([
  "paper_cream",
  "paper_yellow",
  "paper_pink",
  "window_cyan",
  "window_purple",
  "window_pink",
  "window_orange",
  "window_lime",
  "window_blue",
]);

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD local date");

export const emailSchema = z.string().email("Enter a valid email");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    displayName: z.string().trim().min(1, "Display name is required").max(80),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().min(1).max(64),
  unitsSystem: unitsSystemSchema,
  animationMode: animationModeSchema,
  enabledModuleKeys: z.array(z.string()).min(1, "Enable at least one module"),
});

export const reorderCardsSchema = z.object({
  layoutId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  orderedCardIds: z.array(z.string().uuid()).min(1),
});

export const dailyStatusUpdateSchema = z.object({
  statusId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  status: dailyStatusKindSchema,
  summaryText: z.string().max(280).optional(),
  progressValue: z.number().optional(),
  progressTarget: z.number().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
