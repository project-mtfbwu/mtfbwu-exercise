import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCanStoreBlob,
  estimateAvailableBytes,
  storeProgressPhotoBlobSafe,
} from "./progress-quota";

vi.mock("@/shared/offline/progress-outbox", () => ({
  MAX_OFFLINE_PROGRESS_PHOTO_BYTES: 1024,
  storeProgressPhotoBlob: vi.fn(async () => ({ blobId: "s1:p1", byteLength: 100 })),
  deleteProgressPhotoBlob: vi.fn(async () => undefined),
}));

import {
  deleteProgressPhotoBlob,
  storeProgressPhotoBlob,
} from "@/shared/offline/progress-outbox";

describe("assertCanStoreBlob", () => {
  it("rejects blobs over offline limit", () => {
    expect(() => assertCanStoreBlob(2048)).toThrow(/offline limit/i);
  });
});

describe("estimateAvailableBytes", () => {
  it("returns remaining quota when estimate API exists", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 400 }),
      },
    });
    await expect(estimateAvailableBytes()).resolves.toBe(600);
    vi.unstubAllGlobals();
  });

  it("returns null when estimate unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(estimateAvailableBytes()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("storeProgressPhotoBlobSafe", () => {
  beforeEach(() => {
    vi.mocked(storeProgressPhotoBlob).mockReset();
    vi.mocked(deleteProgressPhotoBlob).mockReset();
    vi.mocked(storeProgressPhotoBlob).mockResolvedValue({
      blobId: "s1:p1",
      byteLength: 100,
    });
  });

  it("returns ok on success", async () => {
    const result = await storeProgressPhotoBlobSafe({
      userId: "u1",
      setId: "s1",
      photoId: "p1",
      storagePath: "u1/progress/s1/front-p1.jpg",
      mimeType: "image/jpeg",
      blob: new Blob(["x"]),
    });
    expect(result).toEqual({ ok: true, blobId: "s1:p1", byteLength: 100 });
  });

  it("returns quota code and cleans partial row", async () => {
    vi.mocked(storeProgressPhotoBlob).mockRejectedValue(
      new DOMException("Quota exceeded", "QuotaExceededError"),
    );
    const result = await storeProgressPhotoBlobSafe({
      userId: "u1",
      setId: "s1",
      photoId: "p1",
      storagePath: "u1/progress/s1/front-p1.jpg",
      mimeType: "image/jpeg",
      blob: new Blob(["x"]),
    });
    expect(result).toEqual({
      ok: false,
      code: "quota",
      message: expect.stringMatching(/storage is full/i),
    });
    expect(deleteProgressPhotoBlob).toHaveBeenCalledWith("s1:p1");
  });
});
