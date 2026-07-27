"use client";

import { useTransition } from "react";
import { signOutAction } from "@/shared/auth/actions";
import { clearLocalOfflineData } from "@/shared/offline/clear-local";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <PixelButton
      tone="danger"
      loading={pending}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await clearLocalOfflineData();
          } catch {
            // Still sign out even if IndexedDB clear fails.
          }
          await signOutAction();
        });
      }}
    >
      Sign out
    </PixelButton>
  );
}
