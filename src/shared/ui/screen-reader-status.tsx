"use client";

import { useEffect, useRef } from "react";

/** Announce status changes to screen readers without visual noise. */
export function ScreenReaderStatus({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && message) {
      ref.current.textContent = message;
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
