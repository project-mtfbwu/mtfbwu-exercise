import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  UsdaFoodMaterializer,
  UsdaMaterializeError,
} from "@/modules/nutrition/usda/materialize";

const bodySchema = z.object({
  fdcId: z.coerce.number().int().positive(),
});

/**
 * Materialize a USDA FoodData Central food into the local catalog and return
 * the internal food UUID. The USDA API key never leaves the server.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid FDC id" }, { status: 400 });
  }

  try {
    const result = await new UsdaFoodMaterializer().materializeByFdcId(parsed.data.fdcId);
    return NextResponse.json({
      foodId: result.foodId,
      created: result.created,
      item: {
        id: result.food.id,
        name: result.food.name,
        brand: result.food.brand,
        source: result.food.source,
        nutrientsPer100g: result.food.nutrientsPer100g,
      },
    });
  } catch (error) {
    if (error instanceof UsdaMaterializeError) {
      return NextResponse.json(
        { error: error.message, retryable: error.retryable },
        { status: error.retryable ? 502 : 422 },
      );
    }
    return NextResponse.json({ error: "USDA materialization failed" }, { status: 502 });
  }
}
