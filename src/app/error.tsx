"use client";

import { useEffect } from "react";
import { Button, ErrorMessage } from "@/shared/ui";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mt-paper-panel space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <ErrorMessage>
        The board hit a snag. Your data was not modified by this error screen.
      </ErrorMessage>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <AppLink href={ROUTES.today}>Back to Today</AppLink>
      </div>
    </div>
  );
}
