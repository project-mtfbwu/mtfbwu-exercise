export const APP_NAME = "MTFBWU";
export const APP_TAGLINE = "Mind. Train. Fuel. Be. Well. You.";

/** Documented Node pin — Active LTS as of Increment 1 (2026-07). */
export const NODE_MAJOR = 24;

export const ROUTES = {
  today: "/today",
  calendar: "/calendar",
  history: "/history",
  plans: "/plans",
  rehabPlans: "/rehab/plans",
  progress: "/progress",
  profile: "/profile",
  import: "/import",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  customize: "/customize",
} as const;

export function rehabPlanRoute(planId: string): string {
  return `${ROUTES.rehabPlans}/${planId}`;
}

export function rehabSessionSummaryRoute(sessionId: string): string {
  return `/rehab/sessions/${sessionId}/summary`;
}

/** Routes that require an authenticated session. */
export const PROTECTED_ROUTES = [
  ROUTES.today,
  ROUTES.calendar,
  ROUTES.history,
  ROUTES.plans,
  ROUTES.rehabPlans,
  ROUTES.progress,
  ROUTES.profile,
  ROUTES.import,
  ROUTES.settings,
  ROUTES.onboarding,
  ROUTES.customize,
] as const;

/** Auth screens that bounce signed-in users to Today (except reset-password). */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.signup, ROUTES.forgotPassword] as const;
