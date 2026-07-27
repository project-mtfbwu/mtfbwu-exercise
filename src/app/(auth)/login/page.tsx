import type { Metadata } from "next";
import { AuthForm } from "@/shared/auth/auth-form";
import { signInAction } from "@/shared/auth/actions";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { BoardBackdrop } from "@/widgets/flat-lay-board/board-backdrop";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : ROUTES.today;

  return (
    <BoardBackdrop motionPreference="reduced">
      <div className="py-8">
        <AuthForm
          title="Sign in"
          subtitle="Welcome back to your desk board."
          accent="cyan"
          submitLabel="Sign in"
          action={signInAction}
          hiddenFields={[{ name: "next", value: next }]}
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
          footer={
            <div className="flex flex-wrap justify-between gap-2">
              <AppLink href={ROUTES.signup}>Create account</AppLink>
              <AppLink href={ROUTES.forgotPassword}>Forgot password?</AppLink>
            </div>
          }
        />
      </div>
    </BoardBackdrop>
  );
}
