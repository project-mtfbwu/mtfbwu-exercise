import { getDatabase } from "@/shared/offline/db";

/** Clears IndexedDB app data on logout. Never stores passwords/secrets. */
export async function clearLocalOfflineData(): Promise<void> {
  const db = getDatabase();
  await db.outbox.clear();
  await db.delete();
  const { resetDatabaseSingleton } = await import("@/shared/offline/db");
  resetDatabaseSingleton();
}
