export const APP_NAME = "MTFBWU";
export const APP_TAGLINE = "Mind. Train. Fuel. Be. Well. You.";

/** Documented Node pin — Active LTS as of Increment 1 (2026-07). */
export const NODE_MAJOR = 24;

export const ROUTES = {
  today: "/today",
  calendar: "/calendar",
  plans: "/plans",
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

/** Routes that require an authenticated session. */
export const PROTECTED_ROUTES = [
  ROUTES.today,
  ROUTES.calendar,
  ROUTES.plans,
  ROUTES.progress,
  ROUTES.profile,
  ROUTES.import,
  ROUTES.settings,
  ROUTES.onboarding,
  ROUTES.customize,
] as const;

/** Auth screens that bounce signed-in users to Today (except reset-password). */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.signup, ROUTES.forgotPassword] as const;
