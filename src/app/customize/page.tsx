import type { Metadata } from "next";
import { loadBoardSnapshot } from "@/shared/board/load-board";
import {
  CustomizeBoardClient,
  type CustomTrackerRow,
} from "@/widgets/customize/customize-board-client";
import { createSupabaseServerClient } from "@/shared/database/server";

export const metadata: Metadata = { title: "Customize board" };
export const dynamic = "force-dynamic";

export default async function CustomizePage() {
  const snapshot = await loadBoardSnapshot();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userModules } = await supabase
    .from("user_modules")
    .select("*")
    .eq("user_id", user!.id);

  const { data: definitions } = await supabase
    .from("module_definitions")
    .select("*")
    .eq("is_active", true)
    .order("default_order", { ascending: true });

  const { data: userTrackers } = await supabase
    .from("user_trackers")
    .select("id, custom_name, enabled, archived_at")
    .eq("user_id", user!.id)
    .is("tracker_definition_id", null);

  const trackerIds = (userTrackers ?? []).map((t) => t.id);
  type TargetRow = {
    user_tracker_id: string;
    target_value: number | null;
    target_unit: string | null;
    confirmed_by_user: boolean;
  };
  let targets: TargetRow[] = [];
  if (trackerIds.length > 0) {
    const { data } = await supabase
      .from("tracker_targets")
      .select("user_tracker_id, target_value, target_unit, confirmed_by_user")
      .in("user_tracker_id", trackerIds)
      .order("effective_from", { ascending: false });
    targets = (data ?? []) as TargetRow[];
  }

  const targetByTracker = new Map<string, TargetRow>();
  for (const row of targets ?? []) {
    if (!targetByTracker.has(row.user_tracker_id)) {
      targetByTracker.set(row.user_tracker_id, row);
    }
  }

  const customTrackers: CustomTrackerRow[] = (userTrackers ?? []).map((t) => {
    const target = targetByTracker.get(t.id);
    const customName = (t.custom_name as string | null)?.trim() ?? null;
    return {
      id: t.id,
      displayName: customName || "Custom tracker",
      customName,
      enabled: Boolean(t.enabled),
      archivedAt: (t.archived_at as string | null) ?? null,
      targetValue: target?.target_value != null ? Number(target.target_value) : null,
      targetUnit: (target?.target_unit as string | null) ?? null,
      targetConfirmed: Boolean(target?.confirmed_by_user),
    };
  });

  const defById = new Map((definitions ?? []).map((d) => [d.id, d]));
  const allModules = (userModules ?? [])
    .map((um) => {
      const definition = defById.get(um.module_definition_id);
      if (!definition) return null;
      return { userModule: um, definition };
    })
    .filter(
      (
        row,
      ): row is {
        userModule: NonNullable<typeof userModules>[number];
        definition: NonNullable<typeof definitions>[number];
      } => row !== null,
    );

  return (
    <CustomizeBoardClient
      userId={user!.id}
      layoutId={snapshot.layout.id}
      layoutVersion={snapshot.layout.version}
      cards={snapshot.cards}
      allModules={allModules}
      customTrackers={customTrackers}
      timezone={snapshot.profile.timezone || "UTC"}
    />
  );
}
