import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/database/server";
import { SupabaseProductCache } from "@/modules/nutrition/cache/product-cache";
import { OpenFoodFactsClient } from "@/modules/nutrition/off/client";
import { normalizeOffProduct } from "@/modules/nutrition/off/normalize";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { code } = await params;
  if (!/^[0-9A-Za-z._-]+$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { checkRateLimit, rateLimitResponse } =
    await import("@/shared/security/rate-limit");
  const limited = await checkRateLimit({
    key: `nutrition-barcode:${user.id}`,
    limit: 30,
    windowMs: 60_000,
    onProviderFailure: "fail_open",
  });
  if (!limited.ok) return rateLimitResponse(limited);

  try {
    const cache = new SupabaseProductCache();
    const cached = await cache.getByBarcode(code);
    if (cached) {
      return NextResponse.json({
        barcode: cached.barcode,
        barcodeType: cached.barcodeType,
        brandedProduct: cached.brandedProduct,
        food: cached.food,
        item: cached.food,
        cached: true,
      });
    }

    const product = await new OpenFoodFactsClient().getProduct(code);
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const stored = await cache.upsertFromNormalized(normalizeOffProduct(product, code));
    return NextResponse.json({
      barcode: stored.barcode,
      barcodeType: stored.barcodeType,
      brandedProduct: stored.brandedProduct,
      food: stored.food,
      item: stored.food,
      cached: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Barcode lookup is temporarily unavailable" },
      { status: 502 },
    );
  }
}
