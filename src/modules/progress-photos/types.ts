import type {
  ProgressComparisonType,
  ProgressPhotoSlot,
  ProgressRecordSource,
} from "@/shared/database/types";

export type { ProgressPhotoSlot };

export type ProgressPhotoSetView = {
  id: string;
  localDate: string;
  capturedAt: string;
  timezone: string;
  title: string | null;
  note: string | null;
  source: ProgressRecordSource;
  photos: ProgressPhotoView[];
};

export type ProgressPhotoView = {
  id: string;
  slot: ProgressPhotoSlot;
  customLabel: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  processed: boolean;
  capturedAt: string;
  updatedAt: string;
  checksum: string | null;
  /** Owner-only private path for replacement cleanup (not a public URL). */
  privateStoragePath: string;
  signedUrl?: string | null;
};

/** Active slot identity for editor/replacement (server-loaded). */
export type ProgressPhotoSlotIdentity = {
  photoId: string;
  slot: ProgressPhotoSlot;
  checksum: string | null;
  updatedAt: string;
  privateStoragePath: string;
  signedUrl: string | null;
};

export type ProgressComparisonView = {
  id: string;
  comparisonType: ProgressComparisonType;
  leftPhotoSetId: string | null;
  rightPhotoSetId: string | null;
  leftDate: string | null;
  rightDate: string | null;
  measurementKeys: string[];
  title: string | null;
  createdAt: string;
};

export type CreatePhotoSetInput = {
  localDate: string;
  timezone: string;
  title?: string | null;
  note?: string | null;
};

export type UploadPhotoMetadataInput = {
  setId: string;
  photoId?: string;
  slot: ProgressPhotoSlot;
  customLabel?: string | null;
  storagePath: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: number | null;
  checksum?: string | null;
};
