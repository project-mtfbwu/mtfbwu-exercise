import type { Metadata } from "next";
import { AuthForm } from "@/shared/auth/auth-form";
import { forgotPasswordAction } from "@/shared/auth/actions";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { BoardBackdrop } from "@/widgets/flat-lay-board/board-backdrop";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <BoardBackdrop motionPreference="reduced">
      <div className="py-8">
        <AuthForm
          title="Forgot password"
          subtitle="We'll email a reset link if the account exists."
          accent="orange"
          submitLabel="Send reset link"
          action={forgotPasswordAction}
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
            },
          ]}
          footer={<AppLink href={ROUTES.login}>Back to sign in</AppLink>}
        />
      </div>
    </BoardBackdrop>
  );
}
