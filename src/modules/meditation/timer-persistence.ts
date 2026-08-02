import { getDatabase } from "@/shared/offline/db";
import type { MeditationTimerDraft } from "@/modules/meditation/types";

export function ACTIVE_MEDITATION_TIMER_ID(userId: string): string {
  return `meditation-timer:${userId}`;
}

export async function saveMeditationTimerState(
  draft: MeditationTimerDraft,
): Promise<void> {
  try {
    const db = getDatabase();
    await db.meditationTimerState.put({
      id: ACTIVE_MEDITATION_TIMER_ID(draft.userId),
      userId: draft.userId,
      sessionId: draft.sessionId,
      payload: draft,
      updatedAt: draft.updatedAt,
    });
  } catch {
    /* IndexedDB unavailable (tests / private mode) — skip persist */
  }
}

export async function loadMeditationTimerState(
  userId: string,
): Promise<MeditationTimerDraft | null> {
  try {
    const row = await getDatabase().meditationTimerState.get(
      ACTIVE_MEDITATION_TIMER_ID(userId),
    );
    if (!row?.payload || typeof row.payload !== "object") return null;
    return row.payload as MeditationTimerDraft;
  } catch {
    return null;
  }
}

export async function clearMeditationTimerState(userId: string): Promise<void> {
  try {
    await getDatabase().meditationTimerState.delete(ACTIVE_MEDITATION_TIMER_ID(userId));
  } catch {
    /* noop when IndexedDB unavailable */
  }
}

export async function markMeditationTimerCompletedQueued(
  userId: string,
  sessionId: string,
): Promise<void> {
  const existing = await loadMeditationTimerState(userId);
  if (!existing || existing.sessionId !== sessionId) return;
  const now = new Date().toISOString();
  await saveMeditationTimerState({
    ...existing,
    phase: "completed_queued",
    targetEndAt: null,
    updatedAt: now,
  });
}
