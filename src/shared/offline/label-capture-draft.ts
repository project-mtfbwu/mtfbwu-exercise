import { getDatabase, type LabelCaptureDraft } from "./db";

export type PutLabelCaptureDraftInput = {
  id: string;
  userId: string;
  barcode: string | null;
  payload: unknown;
};

/** Upserts a device-local label-capture draft (e.g. a barcode scanned while offline). */
export async function putLabelCaptureDraft(
  input: PutLabelCaptureDraftInput,
): Promise<void> {
  const db = getDatabase();
  await db.labelCaptureDrafts.put({
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function getLabelCaptureDraft(
  id: string,
): Promise<LabelCaptureDraft | undefined> {
  return getDatabase().labelCaptureDrafts.get(id);
}

export async function listLabelCaptureDraftsForUser(
  userId: string,
): Promise<LabelCaptureDraft[]> {
  return getDatabase().labelCaptureDrafts.where("userId").equals(userId).toArray();
}

export async function clearLabelCaptureDraft(id: string): Promise<void> {
  await getDatabase().labelCaptureDrafts.delete(id);
}
