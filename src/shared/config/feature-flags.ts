import "server-only";

export type FeatureFlagName =
  "barcode" | "ocr" | "progress_camera" | "account_export" | "account_deletion";

function readBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  switch (name) {
    case "barcode":
      return readBool("FEATURE_BARCODE", true);
    case "ocr":
      return readBool("FEATURE_OCR", true);
    case "progress_camera":
      return readBool("FEATURE_PROGRESS_CAMERA", true);
    case "account_export":
      return readBool("FEATURE_ACCOUNT_EXPORT", true);
    case "account_deletion":
      return readBool("FEATURE_ACCOUNT_DELETION", true);
    default:
      return false;
  }
}

export function isPrivateBetaMode(): boolean {
  return readBool("PRIVATE_BETA_MODE", false);
}

export function isPrivateBetaSignupAllowed(email: string): boolean {
  if (!isPrivateBetaMode()) return true;
  const allowlist = (process.env.PRIVATE_BETA_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
