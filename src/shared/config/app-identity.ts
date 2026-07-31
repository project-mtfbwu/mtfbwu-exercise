/** Single source for app metadata (package.json, manifest, About screen). */
export const APP_IDENTITY = {
  product: "MTFBWU",
  name: "MTFBWU",
  packageName: "mtfbwu-exercise",
  description:
    "MTFBWU — personal body-and-training tracker by Anjay Nilmek (Parvat and Shifu Learning Studio LLP). Not medical advice.",
  author: {
    name: "Anjay Nilmek",
  },
  organization: {
    name: "Parvat and Shifu Learning Studio LLP",
  },
  license: "UNLICENSED",
  repository: "https://github.com/project-mtfbwu/mtfbwu-exercise",
  homepage: "https://github.com/project-mtfbwu/mtfbwu-exercise#readme",
  bugs: "https://github.com/project-mtfbwu/mtfbwu-exercise/issues",
  supportUrl: "https://github.com/project-mtfbwu/mtfbwu-exercise/issues",
  privacyUrl: "/settings#privacy",
  version: "0.1.0",
} as const;

/** Prefer CI-injected SHA; fall back for local builds. */
export function resolveBuildIdentifier(): string {
  return (
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "local-dev"
  );
}
