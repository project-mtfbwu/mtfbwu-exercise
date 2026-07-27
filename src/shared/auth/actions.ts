"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/shared/validation/increment3";
import { ROUTES } from "@/shared/config/constants";
import type { AuthActionResult } from "@/shared/auth/action-result";

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "Email or password is incorrect.";
  if (lower.includes("already registered")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("rate limit")) return "Too many attempts. Try again shortly.";
  return message || "Authentication failed.";
}

export async function signInAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error.message) };

  const next = String(formData.get("next") || ROUTES.today);
  redirect(next.startsWith("/") ? next : ROUTES.today);
}

export async function signUpAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}${ROUTES.today}`,
      data: { display_name: parsed.data.displayName },
    },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: parsed.data.displayName,
    });
    await supabase.rpc("ensure_user_board_defaults", { p_user_id: data.user.id });
  }

  if (data.session) {
    redirect(ROUTES.onboarding);
  }

  return {
    ok: true,
    message: "Check your email to confirm the account, then sign in.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}

export async function forgotPasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}${ROUTES.resetPassword}`,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  return {
    ok: true,
    message: "If that email exists, a reset link is on the way.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  redirect(ROUTES.today);
}
