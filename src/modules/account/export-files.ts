/**
 * Private-file export helpers (signed-link manifest approach).
 * ZIP packaging remains future work — see ACCOUNT_EXPORT.md.
 */

export const SIGNED_LINK_TTL_SECONDS = 15 * 60;

export type PrivateFileKind =
  "progress_photo" | "nutrition_label" | "avatar" | "rehab_media";

export type PrivateFileCandidate = {
  kind: PrivateFileKind;
  bucket: string;
  path: string;
  metadataId?: string;
  mimeType?: string | null;
};

export type SignedFileEntry = {
  kind: PrivateFileKind;
  bucket: string;
  path: string;
  metadataId?: string;
  mimeType?: string | null;
  signedUrl: string | null;
  expiresAt: string;
  error?: string;
};

export type PrivateFileManifest = {
  approach: "signed_links";
  signedLinkTtlSeconds: number;
  expiresAt: string;
  files: SignedFileEntry[];
  includedCount: number;
  failedCount: number;
  excludedDeletedCount: number;
  notes: string[];
};

export function assertOwnerStoragePath(userId: string, path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  return (
    normalized === userId ||
    normalized.startsWith(`${userId}/`) ||
    normalized.startsWith(`${userId}\\`)
  );
}

export function filterOwnedActiveFiles(input: {
  userId: string;
  candidates: PrivateFileCandidate[];
  deletedPaths?: Set<string>;
}): {
  included: PrivateFileCandidate[];
  excludedCrossUser: PrivateFileCandidate[];
  excludedDeleted: PrivateFileCandidate[];
} {
  const deleted = input.deletedPaths ?? new Set<string>();
  const included: PrivateFileCandidate[] = [];
  const excludedCrossUser: PrivateFileCandidate[] = [];
  const excludedDeleted: PrivateFileCandidate[] = [];

  for (const file of input.candidates) {
    if (!assertOwnerStoragePath(input.userId, file.path)) {
      excludedCrossUser.push(file);
      continue;
    }
    if (deleted.has(file.path)) {
      excludedDeleted.push(file);
      continue;
    }
    included.push(file);
  }

  return { included, excludedCrossUser, excludedDeleted };
}

export async function buildSignedFileManifest(input: {
  userId: string;
  candidates: PrivateFileCandidate[];
  deletedPaths?: Set<string>;
  ttlSeconds?: number;
  now?: Date;
  createSignedUrl: (
    bucket: string,
    path: string,
    expiresIn: number,
  ) => Promise<{ signedUrl: string | null; error?: string }>;
}): Promise<PrivateFileManifest> {
  const ttl = input.ttlSeconds ?? SIGNED_LINK_TTL_SECONDS;
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
  const { included, excludedDeleted } = filterOwnedActiveFiles({
    userId: input.userId,
    candidates: input.candidates,
    deletedPaths: input.deletedPaths,
  });

  const files: SignedFileEntry[] = [];
  for (const file of included) {
    try {
      const result = await input.createSignedUrl(file.bucket, file.path, ttl);
      files.push({
        kind: file.kind,
        bucket: file.bucket,
        path: file.path,
        metadataId: file.metadataId,
        mimeType: file.mimeType,
        signedUrl: result.signedUrl,
        expiresAt,
        error: result.error ?? (result.signedUrl ? undefined : "signed_url_missing"),
      });
    } catch (error) {
      files.push({
        kind: file.kind,
        bucket: file.bucket,
        path: file.path,
        metadataId: file.metadataId,
        mimeType: file.mimeType,
        signedUrl: null,
        expiresAt,
        error: error instanceof Error ? error.message : "signed_url_failed",
      });
    }
  }

  const failedCount = files.filter((f) => !f.signedUrl).length;
  return {
    approach: "signed_links",
    signedLinkTtlSeconds: ttl,
    expiresAt,
    files,
    includedCount: files.filter((f) => Boolean(f.signedUrl)).length,
    failedCount,
    excludedDeletedCount: excludedDeleted.length,
    notes: [
      "Private files use short-lived signed URLs — never public bucket URLs.",
      "ZIP packaging of binary files is deferred; this manifest is the MVP export.",
      "Soft-deleted and cross-user paths are excluded.",
      "Rehab media is included only when schema metadata provides a path.",
    ],
  };
}
