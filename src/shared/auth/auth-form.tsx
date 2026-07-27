"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import type { AuthActionResult } from "@/shared/auth/action-result";
import { AppLink } from "@/shared/ui/app-link";
import type { RetroWindowAccent } from "@/shared/ui/flat-lay/retro-window";

export type AuthFormField = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
};

export type AuthFormProps = {
  title: string;
  subtitle?: string;
  fields: AuthFormField[];
  hiddenFields?: { name: string; value: string }[];
  submitLabel: string;
  action: (
    prev: AuthActionResult | null,
    formData: FormData,
  ) => Promise<AuthActionResult>;
  footer?: ReactNode;
  accent?: RetroWindowAccent;
};

const initial: AuthActionResult | null = null;

export function AuthForm({
  title,
  subtitle,
  fields,
  hiddenFields = [],
  submitLabel,
  action,
  footer,
  accent = "purple",
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <RetroWindow title={title} accent={accent}>
        {subtitle ? (
          <p className="mb-3 text-sm text-[var(--mt-ink-muted)]">{subtitle}</p>
        ) : null}
        <PaperCard variant="cream" className="!shadow-none">
          <form className="space-y-3" action={formAction} noValidate>
            {hiddenFields.map((field) => (
              <input
                key={field.name}
                type="hidden"
                name={field.name}
                value={field.value}
              />
            ))}
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <label
                  className="block text-sm font-bold text-[var(--mt-ink)]"
                  htmlFor={field.name}
                >
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type ?? "text"}
                  autoComplete={field.autoComplete}
                  required={field.required ?? true}
                  defaultValue={field.defaultValue}
                  disabled={pending}
                  aria-invalid={state && !state.ok ? true : undefined}
                  aria-describedby={state && !state.ok ? "auth-error" : undefined}
                  className="min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-3 text-[var(--mt-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-ring)]"
                />
              </div>
            ))}

            <div
              role="status"
              aria-live="polite"
              className="min-h-6 text-sm font-semibold"
            >
              {state && !state.ok ? (
                <p className="text-[var(--mt-danger)]" id="auth-error">
                  {state.error}
                </p>
              ) : null}
              {state && state.ok && state.message ? (
                <p className="text-[var(--mt-success)]" id="auth-message">
                  {state.message}
                </p>
              ) : null}
            </div>

            <PixelButton
              type="submit"
              tone="primary"
              loading={pending}
              disabled={pending}
              className="w-full"
            >
              {submitLabel}
            </PixelButton>
          </form>
        </PaperCard>
        {footer ? (
          <div className="mt-3 text-sm text-[var(--mt-ink)]">{footer}</div>
        ) : null}
      </RetroWindow>
      <p className="text-center text-xs text-[var(--mt-ink-inverse)]/70">
        GeoCities desk energy · ink-on-paper forms · <AppLink href="/">MTFBWU</AppLink>
      </p>
    </div>
  );
}
