import type { OcrAdapter, OcrProgress, OcrResult } from "./types";

// `typeof import(...)` is type-only and erased at compile time, so
// referencing it here does not pull `tesseract.js` into this module's
// runtime graph — see the barcode module's `zxing-adapter.ts` for the same
// pattern. The package is only ever loaded via the dynamic `import()` call
// inside `loadWorker`, and only once `initialize`/`recognize` is called.
type TesseractModule = typeof import("tesseract.js");
type TesseractWorker = Awaited<ReturnType<TesseractModule["createWorker"]>>;

const DEFAULT_LANGUAGE = "eng";

/**
 * OCR adapter backed by `tesseract.js`, run entirely client-side (no image
 * bytes leave the device). A single worker is reused across recognitions
 * for the lifetime of the adapter; `cancel` terminates and drops that
 * worker so an in-flight recognition stops promptly, and the next
 * `recognize`/`initialize` call transparently recreates it.
 */
export class TesseractOcrAdapter implements OcrAdapter {
  private worker: TesseractWorker | null = null;
  private initializing: Promise<void> | null = null;
  private activeProgressHandler: ((progress: OcrProgress) => void) | null = null;

  get isReady(): boolean {
    return this.worker !== null;
  }

  async initialize(lang: string = DEFAULT_LANGUAGE): Promise<void> {
    if (this.worker) return;
    if (!this.initializing) {
      this.initializing = this.loadWorker(lang).finally(() => {
        this.initializing = null;
      });
    }
    return this.initializing;
  }

  private async loadWorker(lang: string): Promise<void> {
    const tesseract: TesseractModule = await import("tesseract.js");
    this.worker = await tesseract.createWorker(lang, undefined, {
      logger: (message) => {
        this.activeProgressHandler?.({
          status: message.status,
          progress: message.progress,
        });
      },
    });
  }

  async recognize(
    image: Blob,
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrResult> {
    if (!this.worker) await this.initialize();
    const worker = this.worker;
    if (!worker) throw new Error("OCR worker failed to initialize");

    this.activeProgressHandler = onProgress ?? null;
    try {
      const { data } = await worker.recognize(image);
      return { text: data.text, confidence: data.confidence };
    } finally {
      this.activeProgressHandler = null;
    }
  }

  async cancel(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.activeProgressHandler = null;
    if (worker) await worker.terminate().catch(() => undefined);
  }

  async terminate(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.initializing = null;
    this.activeProgressHandler = null;
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

export function createTesseractOcrAdapter(): OcrAdapter {
  return new TesseractOcrAdapter();
}
