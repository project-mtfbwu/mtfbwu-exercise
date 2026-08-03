import { NextResponse } from "next/server";
import { APP_IDENTITY, resolveBuildIdentifier } from "@/shared/config/app-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Liveness — process alive; no secrets. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: APP_IDENTITY.product,
    version: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? APP_IDENTITY.version,
    buildSha: resolveBuildIdentifier(),
    env: process.env.NEXT_PUBLIC_APP_ENV ?? "local",
  });
}
