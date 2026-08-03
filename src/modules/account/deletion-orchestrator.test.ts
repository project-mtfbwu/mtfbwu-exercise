import { describe, expect, it, vi } from "vitest";
import {
  collectStoragePathsRecursive,
  filterOwnedStorageObjects,
  runDeletionOrchestrator,
  type DeletionStageResult,
} from "@/modules/account/deletion-orchestrator";

describe("deletion-orchestrator", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";

  it("rejects cross-user objects", () => {
    const { owned, rejected } = filterOwnedStorageObjects(userId, [
      { bucket: "progress-photos", path: `${userId}/a.jpg` },
      { bucket: "progress-photos", path: `${other}/a.jpg` },
    ]);
    expect(owned).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it("recursively collects nested progress paths", async () => {
    const tree: Record<string, Array<{ name: string; id: string | null }>> = {
      [userId]: [{ name: "progress", id: null }],
      [`${userId}/progress`]: [{ name: "set1", id: null }],
      [`${userId}/progress/set1`]: [{ name: "front-p1.jpg", id: "file-1" }],
    };
    const paths = await collectStoragePathsRecursive({
      userId,
      bucket: "progress-photos",
      listChildren: async (prefix) => tree[prefix] ?? [],
    });
    expect(paths).toEqual([
      {
        bucket: "progress-photos",
        path: `${userId}/progress/set1/front-p1.jpg`,
      },
    ]);
  });

  it("completes full deletion", async () => {
    const stages: DeletionStageResult[] = [];
    const result = await runDeletionOrchestrator({
      userId,
      persistStage: async (s) => {
        stages.push(s);
      },
      listOwnedStorageObjects: async () => [
        { bucket: "progress-photos", path: `${userId}/a.jpg` },
      ],
      deleteStorageObjects: async (objects) => ({
        deleted: objects.map((o) => o.path),
        failed: [],
      }),
      purgeDomainRows: async () => undefined,
      revokeAuthUser: async () => undefined,
    });
    expect(result).toEqual({ ok: true });
    expect(stages.at(-1)?.stage).toBe("completed");
  });

  it("stops on partial storage failure and does not purge", async () => {
    const purge = vi.fn(async () => undefined);
    const revoke = vi.fn(async () => undefined);
    const result = await runDeletionOrchestrator({
      userId,
      persistStage: async () => undefined,
      listOwnedStorageObjects: async () => [
        { bucket: "progress-photos", path: `${userId}/a.jpg` },
      ],
      deleteStorageObjects: async () => ({
        deleted: [],
        failed: [{ path: `${userId}/a.jpg`, error: "permission denied" }],
      }),
      purgeDomainRows: purge,
      revokeAuthUser: revoke,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("delete_storage");
    expect(purge).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it("treats already-deleted storage objects as success", async () => {
    const result = await runDeletionOrchestrator({
      userId,
      persistStage: async () => undefined,
      listOwnedStorageObjects: async () => [
        { bucket: "progress-photos", path: `${userId}/gone.jpg` },
      ],
      deleteStorageObjects: async () => ({
        deleted: [],
        failed: [{ path: `${userId}/gone.jpg`, error: "Object not found" }],
      }),
      purgeDomainRows: async () => undefined,
      revokeAuthUser: async () => undefined,
    });
    expect(result).toEqual({ ok: true });
  });

  it("retries to completion after earlier failure", async () => {
    let attempt = 0;
    const run = () =>
      runDeletionOrchestrator({
        userId,
        persistStage: async () => undefined,
        listOwnedStorageObjects: async () => [
          { bucket: "nutrition-labels", path: `${userId}/l.jpg` },
        ],
        deleteStorageObjects: async (objects) => {
          attempt += 1;
          if (attempt === 1) {
            return {
              deleted: [],
              failed: [{ path: objects[0]!.path, error: "timeout" }],
            };
          }
          return { deleted: objects.map((o) => o.path), failed: [] };
        },
        purgeDomainRows: async () => undefined,
        revokeAuthUser: async () => undefined,
      });

    const first = await run();
    expect(first.ok).toBe(false);
    const second = await run();
    expect(second).toEqual({ ok: true });
  });

  it("never reports success before auth revoke", async () => {
    const stages: DeletionStageResult[] = [];
    const result = await runDeletionOrchestrator({
      userId,
      persistStage: async (s) => {
        stages.push(s);
      },
      listOwnedStorageObjects: async () => [],
      deleteStorageObjects: async () => ({ deleted: [], failed: [] }),
      purgeDomainRows: async () => undefined,
      revokeAuthUser: async () => {
        throw new Error("auth_delete_failed");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("revoke_auth");
    expect(stages.some((s) => s.stage === "completed")).toBe(false);
  });

  it("fails closed when enumeration returns cross-user paths", async () => {
    const result = await runDeletionOrchestrator({
      userId,
      persistStage: async () => undefined,
      listOwnedStorageObjects: async () => [
        { bucket: "progress-photos", path: `${other}/evil.jpg` },
      ],
      deleteStorageObjects: async () => ({ deleted: [], failed: [] }),
      purgeDomainRows: async () => undefined,
      revokeAuthUser: async () => undefined,
    });
    expect(result.ok).toBe(false);
  });

  it("is idempotent on second successful execution", async () => {
    const deps = {
      userId,
      persistStage: async () => undefined,
      listOwnedStorageObjects: async () => [],
      deleteStorageObjects: async () => ({ deleted: [], failed: [] }),
      purgeDomainRows: async () => undefined,
      revokeAuthUser: async () => undefined,
    };
    expect(await runDeletionOrchestrator(deps)).toEqual({ ok: true });
    expect(await runDeletionOrchestrator(deps)).toEqual({ ok: true });
  });
});
