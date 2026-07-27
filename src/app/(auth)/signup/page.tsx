import type { Metadata } from "next";
import { AuthForm } from "@/shared/auth/auth-form";
import { signUpAction } from "@/shared/auth/actions";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { BoardBackdrop } from "@/widgets/flat-lay-board/board-backdrop";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <BoardBackdrop motionPreference="reduced">
      <div className="py-8">
        <AuthForm
          title="Create account"
          subtitle="Email + password. No social providers yet."
          accent="pink"
          submitLabel="Sign up"
          action={signUpAction}
          fields={[
            {
              name: "displayName",
              label: "Display name",
              autoComplete: "nickname",
            },
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
              autoComplete: "new-password",
            },
            {
              name: "confirmPassword",
              label: "Confirm password",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
          footer={<AppLink href={ROUTES.login}>Already have an account? Sign in</AppLink>}
        />
      </div>
    </BoardBackdrop>
  );
}
