import { describe, expect, it } from "vitest";
import { isAuthRoutePath, isProtectedPath, matchesPath } from "@/shared/auth/session";
import { ROUTES } from "@/shared/config/constants";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/shared/validation/increment3";
import { isLayoutConflictError, isStatusConflictError } from "@/shared/board/board-model";

describe("protected route helpers", () => {
  it("matches nested protected paths", () => {
    expect(isProtectedPath(ROUTES.today)).toBe(true);
    expect(isProtectedPath(`${ROUTES.settings}/extra`)).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(matchesPath("/today", "/today")).toBe(true);
  });

  it("treats login/signup/forgot as auth bounce routes", () => {
    expect(isAuthRoutePath(ROUTES.login)).toBe(true);
    expect(isAuthRoutePath(ROUTES.signup)).toBe(true);
    expect(isAuthRoutePath(ROUTES.forgotPassword)).toBe(true);
    expect(isAuthRoutePath(ROUTES.resetPassword)).toBe(false);
  });
});

describe("auth form validation", () => {
  it("rejects empty password on sign-in", () => {
    const result = signInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched sign-up passwords", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.co",
      password: "password1",
      confirmPassword: "password2",
      displayName: "Ada",
    });
    expect(result.success).toBe(false);
  });

  it("accepts forgot-password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
  });
});

describe("conflict helpers", () => {
  it("detects layout and status conflict markers", () => {
    expect(isLayoutConflictError("layout_version_conflict")).toBe(true);
    expect(isStatusConflictError("status_revision_conflict")).toBe(true);
    expect(isStatusConflictError("status_completed_protected")).toBe(true);
    expect(isLayoutConflictError("network")).toBe(false);
  });
});
