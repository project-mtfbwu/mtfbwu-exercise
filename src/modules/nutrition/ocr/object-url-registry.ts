/**
 * Tracks blob object URLs so label-capture UI can revoke them deterministically
 * (preview, cropped preview, temporary drafts).
 */
export class ObjectUrlRegistry {
  private readonly urls = new Set<string>();

  create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revoke(url: string | null | undefined): void {
    if (!url || !this.urls.has(url)) return;
    URL.revokeObjectURL(url);
    this.urls.delete(url);
  }

  revokeAll(): void {
    for (const url of this.urls) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }

  get size(): number {
    return this.urls.size;
  }

  has(url: string): boolean {
    return this.urls.has(url);
  }
}
