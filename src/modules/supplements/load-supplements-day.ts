import { createSupabaseServerClient } from "@/shared/database/server";
import type {
  SupplementDaySummary,
  SupplementIntakeView,
  UserSupplementView,
} from "@/modules/supplements/types";

const EMPTY: SupplementDaySummary = {
  activeSupplements: [],
  intakes: [],
  takenCount: 0,
  skippedCount: 0,
  totalActive: 0,
};

function userSupplementView(row: Record<string, unknown>): UserSupplementView {
  const catalog = row.supplement_definitions as Record<string, unknown> | null;
  const customName = (row.custom_name as string | null)?.trim() ?? null;
  return {
    id: String(row.id),
    supplementDefinitionId: row.supplement_definition_id
      ? String(row.supplement_definition_id)
      : null,
    customName,
    brand: (row.brand as string | null) ?? null,
    servingAmount: row.serving_amount != null ? Number(row.serving_amount) : null,
    servingUnit: (row.serving_unit as string | null) ?? null,
    instructionsText: (row.instructions_text as string | null) ?? null,
    active: Boolean(row.active),
    displayName: customName || String(catalog?.display_name ?? "Supplement"),
  };
}

function intakeView(row: Record<string, unknown>): SupplementIntakeView {
  return {
    id: String(row.id),
    userSupplementId: String(row.user_supplement_id),
    localDate: String(row.local_date),
    takenAt: String(row.taken_at),
    amount: row.amount != null ? Number(row.amount) : null,
    unit: (row.unit as string | null) ?? null,
    status: row.status as SupplementIntakeView["status"],
    note: (row.note as string | null) ?? null,
  };
}

export async function loadSupplementsDaySummary(
  localDate: string,
): Promise<SupplementDaySummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return EMPTY;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return EMPTY;

  const { data: supplements } = await db
    .from("user_supplements")
    .select("*, supplement_definitions(display_name)")
    .eq("user_id", user.id)
    .eq("active", true);

  const { data: intakes } = await db
    .from("supplement_intakes")
    .select("*")
    .eq("user_id", user.id)
    .eq("local_date", localDate)
    .is("deleted_at", null);

  const active = (supplements ?? []).map(userSupplementView);
  const intakeViews = (intakes ?? []).map(intakeView);

  return {
    activeSupplements: active,
    intakes: intakeViews,
    takenCount: intakeViews.filter((i) => i.status === "taken" || i.status === "partial")
      .length,
    skippedCount: intakeViews.filter((i) => i.status === "skipped").length,
    totalActive: active.length,
  };
}
