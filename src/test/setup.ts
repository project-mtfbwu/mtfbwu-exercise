import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {
        /* deprecated */
      },
      removeListener() {
        /* deprecated */
      },
      addEventListener() {
        /* no-op */
      },
      removeEventListener() {
        /* no-op */
      },
      dispatchEvent() {
        return false;
      },
    }),
  });
}
