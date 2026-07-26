import { type NextRequest } from "next/server";
import { updateSession } from "@/shared/auth/session";

/**
 * Next.js 16 request proxy — refreshes Supabase auth cookies before routes render.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Exclude Next internals and common public static assets so session refresh
 * does not run on CSS/JS/images (or block them if auth logic grows later).
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
