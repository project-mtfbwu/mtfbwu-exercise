/**
 * Sync coordinator — no-op shell for Increment 1.
 * Real flush against Supabase arrives with offline kernel increments.
 */
export interface SyncCoordinator {
  flush(): Promise<{ processed: number }>;
  getLastError(): string | null;
}

export function createNoOpSyncCoordinator(): SyncCoordinator {
  let lastError: string | null = null;
  return {
    async flush() {
      lastError = null;
      return { processed: 0 };
    },
    getLastError() {
      return lastError;
    },
  };
}
