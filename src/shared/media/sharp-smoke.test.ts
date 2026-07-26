/**
 * Smoke test for Next.js optional image-optimizer dependency (sharp).
 *
 * Next nests sharp as an optionalDependency. We do not add sharp as a direct
 * app dependency; this test resolves the copy Next uses (after overrides).
 *
 * Limitation: this does not exercise Next's full `/_next/image` optimizer HTTP
 * path. It verifies the patched sharp/libvips stack can import, read metadata,
 * and resize a tiny in-memory PNG — the production image-optimizer primitives.
 *
 * @vitest-environment node
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type SharpFactory = ((
  input?:
    | Buffer
    | {
        create: {
          width: number;
          height: number;
          channels: number;
          background: { r: number; g: number; b: number; alpha: number };
        };
      },
) => {
  png: () => { toBuffer: () => Promise<Buffer> };
  metadata: () => Promise<{ format?: string; width?: number; height?: number }>;
  resize: (
    width: number,
    height?: number,
    options?: { fit?: string },
  ) => { png: () => { toBuffer: () => Promise<Buffer> } };
}) & {
  versions: { sharp: string; vips: string };
};

function loadSharpFromNext(): SharpFactory {
  const require = createRequire(import.meta.url);
  const nextPkg = require.resolve("next/package.json");
  const requireFromNext = createRequire(nextPkg);
  return requireFromNext("sharp") as SharpFactory;
}

describe("sharp image-processing smoke (next optional path)", () => {
  it("resolves a patched sharp and resizes an in-memory PNG", async () => {
    const sharp = loadSharpFromNext();

    expect(sharp.versions.sharp).toMatch(/^0\.35\./);
    expect(sharp.versions.vips).toBeTruthy();

    const minor = Number.parseInt(sharp.versions.sharp.split(".")[1] ?? "0", 10);
    expect(minor).toBeGreaterThanOrEqual(35);

    const input = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 32, g: 64, b: 128, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    expect(input.byteLength).toBeGreaterThan(0);

    const metaIn = await sharp(input).metadata();
    expect(metaIn.format).toBe("png");
    expect(metaIn.width).toBe(8);
    expect(metaIn.height).toBe(8);

    const output = await sharp(input).resize(4, 4, { fit: "fill" }).png().toBuffer();

    expect(output.byteLength).toBeGreaterThan(0);

    const metaOut = await sharp(output).metadata();
    expect(metaOut.format).toBe("png");
    expect(metaOut.width).toBe(4);
    expect(metaOut.height).toBe(4);
  });
});
