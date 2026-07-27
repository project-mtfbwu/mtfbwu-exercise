import type { Metadata } from "next";
import { AuthForm } from "@/shared/auth/auth-form";
import { resetPasswordAction } from "@/shared/auth/actions";
import { BoardBackdrop } from "@/widgets/flat-lay-board/board-backdrop";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <BoardBackdrop motionPreference="reduced">
      <div className="py-8">
        <AuthForm
          title="Choose a new password"
          subtitle="Complete the reset from your email link, then save a new password."
          accent="purple"
          submitLabel="Update password"
          action={resetPasswordAction}
          fields={[
            {
              name: "password",
              label: "New password",
              type: "password",
              autoComplete: "new-password",
            },
            {
              name: "confirmPassword",
              label: "Confirm new password",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      </div>
    </BoardBackdrop>
  );
}
