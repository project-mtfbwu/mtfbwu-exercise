import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/shared/database/types";
import { AUTH_ROUTES, PROTECTED_ROUTES, ROUTES } from "@/shared/config/constants";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isAuthRoutePath(pathname: string) {
  return AUTH_ROUTES.some((route) => matchesPath(pathname, route));
}

/**
 * Refresh Supabase auth cookies and enforce route protection.
 * Avoids flashing protected UI by redirecting in the proxy layer.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;

  if (!url || !anonKey) {
    // Fail closed in production / production APP_ENV — do not allow unprotected shell.
    const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
    if (process.env.NODE_ENV === "production" || appEnv === "production") {
      return new NextResponse("Service misconfigured", { status: 503 });
    }
    // Local/dev without env: allow shell routes so docs/CI static checks still work.
    return response;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoutePath(pathname)) {
    const todayUrl = request.nextUrl.clone();
    todayUrl.pathname = ROUTES.today;
    todayUrl.search = "";
    return NextResponse.redirect(todayUrl);
  }

  return response;
}
