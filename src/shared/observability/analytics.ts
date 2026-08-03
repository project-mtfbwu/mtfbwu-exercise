/**
 * Consent-ready analytics boundary.
 * Default: off. Never send meal contents, measurements, photos, rehab symptoms,
 * clinician details, or supplement names.
 */

export type AnalyticsEventName =
  | "onboarding_completed"
  | "module_enabled"
  | "session_completed"
  | "sync_failed"
  | "feature_error";

export type AnalyticsConsent = {
  enabled: boolean;
  updatedAt: string | null;
};

let consent: AnalyticsConsent = { enabled: false, updatedAt: null };

export function getAnalyticsConsent(): AnalyticsConsent {
  return consent;
}

export function setAnalyticsConsent(enabled: boolean): void {
  consent = { enabled, updatedAt: new Date().toISOString() };
}

export function trackProductEvent(
  name: AnalyticsEventName,
  props: Record<string, string | number | boolean> = {},
): void {
  if (!consent.enabled) return;
  // Safe operational sink — structured console only until a provider is approved.
  console.info(
    JSON.stringify({
      type: "analytics",
      name,
      props,
      ts: new Date().toISOString(),
    }),
  );
}
