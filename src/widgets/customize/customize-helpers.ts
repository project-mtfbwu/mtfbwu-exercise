import type { BoardCardView } from "@/shared/board/board-model";

/** Swap card order — pure helper for tests and UI. */
export function moveCardIndex(
  cards: BoardCardView[],
  index: number,
  direction: -1 | 1,
): BoardCardView[] {
  const target = index + direction;
  if (target < 0 || target >= cards.length) return cards;
  const next = [...cards];
  const tmp = next[index]!;
  next[index] = next[target]!;
  next[target] = tmp;
  return next;
}

export function cardsDirty(draft: BoardCardView[], committed: BoardCardView[]): boolean {
  if (draft.length !== committed.length) return true;
  return draft.some((c, i) => c.card.id !== committed[i]?.card.id);
}
