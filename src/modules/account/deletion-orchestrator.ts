/**
 * Account deletion storage + domain purge orchestrator.
 * Stages are retry-safe; success is never reported before mandatory stages finish.
 */

export type DeletionStage =
  | "requested"
  | "enumerate_storage"
  | "delete_storage"
  | "purge_domain"
  | "revoke_auth"
  | "completed"
  | "failed";

export type StorageObjectRef = {
  bucket: string;
  path: string;
};

export type DeletionStageResult = {
  stage: DeletionStage;
  ok: boolean;
  detail?: string;
  deletedPaths?: string[];
  failedPaths?: string[];
};

export type DeletionOrchestratorDeps = {
  userId: string;
  listOwnedStorageObjects: () => Promise<StorageObjectRef[]>;
  deleteStorageObjects: (
    objects: StorageObjectRef[],
  ) => Promise<{ deleted: string[]; failed: Array<{ path: string; error: string }> }>;
  purgeDomainRows: () => Promise<void>;
  revokeAuthUser: () => Promise<void>;
  persistStage: (result: DeletionStageResult) => Promise<void>;
};

export function assertOwnedObject(userId: string, path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  return normalized === userId || normalized.startsWith(`${userId}/`);
}

export function filterOwnedStorageObjects(
  userId: string,
  objects: StorageObjectRef[],
): { owned: StorageObjectRef[]; rejected: StorageObjectRef[] } {
  const owned: StorageObjectRef[] = [];
  const rejected: StorageObjectRef[] = [];
  for (const obj of objects) {
    if (assertOwnedObject(userId, obj.path)) owned.push(obj);
    else rejected.push(obj);
  }
  return { owned, rejected };
}

/**
 * Recursively flatten a folder listing into object paths under `prefix`.
 * `listChildren(prefix)` returns names; folders are those with `id === null`
 * (Supabase Storage convention) or marked `isFolder`.
 */
export async function collectStoragePathsRecursive(input: {
  userId: string;
  bucket: string;
  listChildren: (
    prefix: string,
  ) => Promise<Array<{ name: string; id: string | null; isFolder?: boolean }>>;
  maxDepth?: number;
}): Promise<StorageObjectRef[]> {
  const maxDepth = input.maxDepth ?? 8;
  const out: StorageObjectRef[] = [];

  async function walk(prefix: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    const children = await input.listChildren(prefix);
    for (const child of children) {
      const path = prefix ? `${prefix}/${child.name}` : child.name;
      const isFolder = child.isFolder === true || child.id === null;
      if (isFolder) {
        await walk(path, depth + 1);
      } else if (assertOwnedObject(input.userId, path)) {
        out.push({ bucket: input.bucket, path });
      }
    }
  }

  await walk(input.userId, 0);
  return out;
}

export async function runDeletionOrchestrator(
  deps: DeletionOrchestratorDeps,
): Promise<{ ok: true } | { ok: false; stage: DeletionStage; error: string }> {
  await deps.persistStage({ stage: "requested", ok: true });

  let objects: StorageObjectRef[] = [];
  try {
    await deps.persistStage({ stage: "enumerate_storage", ok: true });
    const listed = await deps.listOwnedStorageObjects();
    const { owned, rejected } = filterOwnedStorageObjects(deps.userId, listed);
    if (rejected.length > 0) {
      await deps.persistStage({
        stage: "failed",
        ok: false,
        detail: `cross_user_paths_rejected:${rejected.length}`,
      });
      return {
        ok: false,
        stage: "enumerate_storage",
        error: "Refusing to delete objects outside owner prefix",
      };
    }
    objects = owned;
  } catch (error) {
    const message = error instanceof Error ? error.message : "enumerate_failed";
    await deps.persistStage({
      stage: "failed",
      ok: false,
      detail: message,
    });
    return { ok: false, stage: "enumerate_storage", error: message };
  }

  try {
    await deps.persistStage({
      stage: "delete_storage",
      ok: true,
      detail: `candidates:${objects.length}`,
    });
    const result = await deps.deleteStorageObjects(objects);
    if (result.failed.length > 0) {
      // Treat "already missing" as success when callers mark them deleted.
      const hardFailures = result.failed.filter(
        (f) => !/not found|404|does not exist/i.test(f.error),
      );
      if (hardFailures.length > 0) {
        await deps.persistStage({
          stage: "failed",
          ok: false,
          detail: "storage_partial_failure",
          deletedPaths: result.deleted,
          failedPaths: hardFailures.map((f) => f.path),
        });
        return {
          ok: false,
          stage: "delete_storage",
          error: `Storage cleanup incomplete (${hardFailures.length} failed)`,
        };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "storage_delete_failed";
    await deps.persistStage({ stage: "failed", ok: false, detail: message });
    return { ok: false, stage: "delete_storage", error: message };
  }

  try {
    await deps.persistStage({ stage: "purge_domain", ok: true });
    await deps.purgeDomainRows();
  } catch (error) {
    const message = error instanceof Error ? error.message : "domain_purge_failed";
    await deps.persistStage({ stage: "failed", ok: false, detail: message });
    return { ok: false, stage: "purge_domain", error: message };
  }

  try {
    await deps.persistStage({ stage: "revoke_auth", ok: true });
    await deps.revokeAuthUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth_revoke_failed";
    await deps.persistStage({ stage: "failed", ok: false, detail: message });
    return { ok: false, stage: "revoke_auth", error: message };
  }

  await deps.persistStage({ stage: "completed", ok: true });
  return { ok: true };
}
