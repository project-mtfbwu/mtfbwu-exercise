import { z } from "zod";

export const progressPhotoSlotSchema = z.enum([
  "front",
  "side_left",
  "side_right",
  "back",
  "custom",
]);

export const createPhotoSetSchema = z.object({
  id: z.string().uuid().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
  title: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const uploadPhotoMetadataSchema = z.object({
  setId: z.string().uuid(),
  photoId: z.string().uuid().optional(),
  slot: progressPhotoSlotSchema,
  customLabel: z.string().trim().min(1).max(80).nullable().optional(),
  storagePath: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  checksum: z.string().max(128).nullable().optional(),
});

export const replacePhotoSlotSchema = uploadPhotoMetadataSchema.extend({
  previousPhotoId: z.string().uuid().nullable().optional(),
});

export const deletePhotoSetSchema = z.object({
  setId: z.string().uuid(),
});

export const deletePhotoSchema = z.object({
  photoId: z.string().uuid(),
});

export const signedUrlSchema = z.object({
  storagePath: z.string().min(1),
  expiresInSeconds: z.number().int().min(60).max(3600).default(300),
});
