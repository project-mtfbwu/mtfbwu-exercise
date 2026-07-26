"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MotionPreferenceProvider } from "./motion-provider";
import { useOnlineStatus } from "@/shared/offline/use-online-status";

function OnlineStatusBootstrap({ children }: { children: ReactNode }) {
  useOnlineStatus();
  return children;
}

/**
 * Root provider composition for Increment 1.
 * Auth session + focus-layer providers arrive in later increments.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionPreferenceProvider>
        <OnlineStatusBootstrap>{children}</OnlineStatusBootstrap>
      </MotionPreferenceProvider>
    </QueryClientProvider>
  );
}
