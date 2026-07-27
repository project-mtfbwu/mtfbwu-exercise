"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  cardVisualVariantSchema,
  dailyStatusUpdateSchema,
  onboardingProfileSchema,
  reorderCardsSchema,
} from "@/shared/validation/increment3";
import { ROUTES } from "@/shared/config/constants";
import { redirect } from "next/navigation";
import { isLayoutConflictError, isStatusConflictError } from "@/shared/board/board-model";

export type MutationResult =
  { ok: true; message?: string } | { ok: false; error: string; conflict?: boolean };

export async function completeOnboardingAction(input: unknown): Promise<MutationResult> {
  const parsed = onboardingProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  await supabase.rpc("ensure_user_board_defaults", { p_user_id: user.id });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      units_system: parsed.data.unitsSystem,
      animation_mode: parsed.data.animationMode,
      onboarding_completed: true,
      onboarding_step: 6,
    })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const { data: definitions } = await supabase
    .from("module_definitions")
    .select("id, key")
    .eq("is_active", true);

  const enabled = new Set(parsed.data.enabledModuleKeys);
  for (const def of definitions ?? []) {
    await supabase
      .from("user_modules")
      .update({ enabled: enabled.has(def.key) })
      .eq("user_id", user.id)
      .eq("module_definition_id", def.id);
  }

  // Rebuild active layout cards for enabled modules
  const { data: layout } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (layout) {
    await supabase.from("dashboard_cards").delete().eq("dashboard_layout_id", layout.id);

    const { data: modules } = await supabase
      .from("user_modules")
      .select("id, module_definition_id, enabled")
      .eq("user_id", user.id)
      .eq("enabled", true);

    const defById = new Map((definitions ?? []).map((d) => [d.id, d]));
    let pos = 0;
    for (const um of modules ?? []) {
      const def = definitions?.find((d) => d.id === um.module_definition_id);
      const full = await supabase
        .from("module_definitions")
        .select("visual_variant, default_order, key")
        .eq("id", um.module_definition_id)
        .maybeSingle();
      void defById;
      void def;
      await supabase.from("dashboard_cards").insert({
        dashboard_layout_id: layout.id,
        user_module_id: um.id,
        position_index: pos,
        desktop_column: pos % 3,
        desktop_row: Math.floor(pos / 3),
        tablet_position: pos,
        mobile_position: pos,
        visual_variant: full.data?.visual_variant ?? "paper_cream",
      });
      pos += 1;
    }

    await supabase
      .from("dashboard_layouts")
      .update({ version: layout.version + 1 })
      .eq("id", layout.id);
  }

  revalidatePath(ROUTES.today);
  redirect(ROUTES.today);
}

export async function reorderBoardCardsAction(input: unknown): Promise<MutationResult> {
  const parsed = reorderCardsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const { error: bumpError } = await supabase.rpc("bump_dashboard_layout_version", {
    p_layout_id: parsed.data.layoutId,
    p_expected_version: parsed.data.expectedVersion,
  });

  if (bumpError) {
    return {
      ok: false,
      conflict: isLayoutConflictError(bumpError.message),
      error: isLayoutConflictError(bumpError.message)
        ? "Layout changed on another device. Refresh and try again."
        : bumpError.message,
    };
  }

  // Temporary high positions to avoid unique collisions, then assign final order
  let temp = 10_000;
  for (const cardId of parsed.data.orderedCardIds) {
    await supabase
      .from("dashboard_cards")
      .update({
        position_index: temp,
        mobile_position: temp,
        tablet_position: temp,
      })
      .eq("id", cardId)
      .eq("dashboard_layout_id", parsed.data.layoutId);
    temp += 1;
  }

  let pos = 0;
  for (const cardId of parsed.data.orderedCardIds) {
    await supabase
      .from("dashboard_cards")
      .update({
        position_index: pos,
        mobile_position: pos,
        tablet_position: pos,
        desktop_column: pos % 3,
        desktop_row: Math.floor(pos / 3),
      })
      .eq("id", cardId)
      .eq("dashboard_layout_id", parsed.data.layoutId);
    pos += 1;
  }

  revalidatePath(ROUTES.customize);
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Layout saved" };
}

export async function setModuleEnabledAction(input: {
  userModuleId: string;
  enabled: boolean;
}): Promise<MutationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const { error } = await supabase
    .from("user_modules")
    .update({ enabled: input.enabled })
    .eq("id", input.userModuleId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  const { data: layout } = await supabase
    .from("dashboard_layouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (layout && !input.enabled) {
    await supabase
      .from("dashboard_cards")
      .delete()
      .eq("dashboard_layout_id", layout.id)
      .eq("user_module_id", input.userModuleId);
  }

  // Ensure enabled modules have cards (idempotent).
  await supabase.rpc("ensure_user_board_defaults", { p_user_id: user.id });

  revalidatePath(ROUTES.customize);
  revalidatePath(ROUTES.today);
  return { ok: true };
}

export async function updateCardVariantAction(input: {
  cardId: string;
  layoutId: string;
  visualVariant: string;
}): Promise<MutationResult> {
  const parsed = cardVisualVariantSchema.safeParse(input.visualVariant);
  if (!parsed.success) {
    return { ok: false, error: "Unsupported visual variant" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const { data: layout } = await supabase
    .from("dashboard_layouts")
    .select("id")
    .eq("id", input.layoutId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!layout) return { ok: false, error: "Layout not found" };

  const { error } = await supabase
    .from("dashboard_cards")
    .update({ visual_variant: parsed.data })
    .eq("id", input.cardId)
    .eq("dashboard_layout_id", layout.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(ROUTES.customize);
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Card look updated" };
}

export async function updateDailyStatusAction(input: unknown): Promise<MutationResult> {
  const parsed = dailyStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const { error } = await supabase.rpc("apply_daily_module_status", {
    p_status_id: parsed.data.statusId,
    p_expected_revision: parsed.data.expectedRevision,
    p_status: parsed.data.status,
    ...(parsed.data.summaryText !== undefined
      ? { p_summary_text: parsed.data.summaryText }
      : {}),
    ...(parsed.data.progressValue !== undefined
      ? { p_progress_value: parsed.data.progressValue }
      : {}),
    ...(parsed.data.progressTarget !== undefined
      ? { p_progress_target: parsed.data.progressTarget }
      : {}),
  });

  if (error) {
    return {
      ok: false,
      conflict: isStatusConflictError(error.message),
      error: isStatusConflictError(error.message)
        ? "Status conflict — refresh the board and try again."
        : error.message,
    };
  }

  revalidatePath(ROUTES.today);
  return { ok: true, message: "Daily status saved" };
}

export async function resetLayoutAction(): Promise<MutationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  // Re-run defaults by deleting cards and calling ensure
  const { data: layout } = await supabase
    .from("dashboard_layouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (layout) {
    await supabase.from("dashboard_cards").delete().eq("dashboard_layout_id", layout.id);
  }

  // Enable default modules again
  const { data: defs } = await supabase
    .from("module_definitions")
    .select("id, default_enabled")
    .eq("is_active", true);

  for (const def of defs ?? []) {
    await supabase
      .from("user_modules")
      .update({ enabled: def.default_enabled })
      .eq("user_id", user.id)
      .eq("module_definition_id", def.id);
  }

  await supabase.rpc("ensure_user_board_defaults", { p_user_id: user.id });

  revalidatePath(ROUTES.customize);
  revalidatePath(ROUTES.today);
  return { ok: true, message: "Layout reset to defaults" };
}
