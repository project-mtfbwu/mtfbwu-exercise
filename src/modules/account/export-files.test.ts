import { describe, expect, it, vi } from "vitest";
import {
  assertOwnerStoragePath,
  buildSignedFileManifest,
  filterOwnedActiveFiles,
} from "@/modules/account/export-files";

describe("export-files", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";

  it("includes own file paths", () => {
    const { included } = filterOwnedActiveFiles({
      userId,
      candidates: [
        {
          kind: "progress_photo",
          bucket: "progress-photos",
          path: `${userId}/progress/set/a.jpg`,
        },
      ],
    });
    expect(included).toHaveLength(1);
  });

  it("excludes cross-user paths", () => {
    const { excludedCrossUser } = filterOwnedActiveFiles({
      userId,
      candidates: [
        {
          kind: "progress_photo",
          bucket: "progress-photos",
          path: `${other}/progress/set/a.jpg`,
        },
      ],
    });
    expect(excludedCrossUser).toHaveLength(1);
    expect(assertOwnerStoragePath(userId, `${other}/x`)).toBe(false);
  });

  it("excludes deleted paths", () => {
    const path = `${userId}/progress/set/a.jpg`;
    const { included, excludedDeleted } = filterOwnedActiveFiles({
      userId,
      candidates: [{ kind: "progress_photo", bucket: "progress-photos", path }],
      deletedPaths: new Set([path]),
    });
    expect(included).toHaveLength(0);
    expect(excludedDeleted).toHaveLength(1);
  });

  it("records signed link expiry", async () => {
    const now = new Date("2026-08-02T12:00:00.000Z");
    const manifest = await buildSignedFileManifest({
      userId,
      now,
      ttlSeconds: 900,
      candidates: [
        {
          kind: "nutrition_label",
          bucket: "nutrition-labels",
          path: `${userId}/nutrition-labels/c1.jpg`,
        },
      ],
      createSignedUrl: async () => ({
        signedUrl: "https://example.test/signed",
      }),
    });
    expect(manifest.expiresAt).toBe("2026-08-02T12:15:00.000Z");
    expect(manifest.includedCount).toBe(1);
    expect(manifest.files[0]?.signedUrl).toContain("signed");
  });

  it("supports export with no files", async () => {
    const manifest = await buildSignedFileManifest({
      userId,
      candidates: [],
      createSignedUrl: async () => ({ signedUrl: "x" }),
    });
    expect(manifest.includedCount).toBe(0);
    expect(manifest.files).toHaveLength(0);
  });

  it("reports partial file failures honestly", async () => {
    const manifest = await buildSignedFileManifest({
      userId,
      candidates: [
        {
          kind: "progress_photo",
          bucket: "progress-photos",
          path: `${userId}/progress/set/ok.jpg`,
        },
        {
          kind: "progress_photo",
          bucket: "progress-photos",
          path: `${userId}/progress/set/bad.jpg`,
        },
      ],
      createSignedUrl: async (_b, path) => {
        if (path.endsWith("bad.jpg")) return { signedUrl: null, error: "boom" };
        return { signedUrl: "https://example.test/ok" };
      },
    });
    expect(manifest.includedCount).toBe(1);
    expect(manifest.failedCount).toBe(1);
    expect(manifest.files.find((f) => f.path.endsWith("bad.jpg"))?.error).toBe("boom");
  });

  it("surfaces thrown signed-url errors", async () => {
    const createSignedUrl = vi.fn(async () => {
      throw new Error("provider_down");
    });
    const manifest = await buildSignedFileManifest({
      userId,
      candidates: [
        {
          kind: "avatar",
          bucket: "avatars",
          path: `${userId}/avatar.jpg`,
        },
      ],
      createSignedUrl,
    });
    expect(manifest.failedCount).toBe(1);
    expect(manifest.files[0]?.error).toBe("provider_down");
  });
});
