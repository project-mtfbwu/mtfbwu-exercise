import type { BoardSnapshot } from "@/shared/board/board-model";
import type {
  CardVisualVariant,
  DailyModuleStatus,
  DashboardCard,
  DashboardLayout,
  ModuleDefinition,
  Profile,
  UserModule,
} from "@/shared/database/types";

const now = "2026-07-26T12:00:00.000Z";

function moduleDef(
  partial: Partial<ModuleDefinition> &
    Pick<ModuleDefinition, "id" | "key" | "display_name">,
): ModuleDefinition {
  return {
    description: partial.description ?? "",
    category: partial.category ?? "lifestyle",
    default_enabled: true,
    default_order: partial.default_order ?? 0,
    visual_variant: (partial.visual_variant ?? "paper_cream") as CardVisualVariant,
    icon_key: partial.icon_key ?? partial.key,
    supports_target: false,
    supports_calendar: true,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

export function createTestBoardSnapshot(
  overrides?: Partial<BoardSnapshot>,
): BoardSnapshot {
  const profile: Profile = {
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "Test Athlete",
    avatar_path: null,
    timezone: "UTC",
    locale: "en-US",
    units_system: "metric",
    animation_mode: "off",
    onboarding_completed: true,
    onboarding_step: 6,
    created_at: now,
    updated_at: now,
  };

  const layout: DashboardLayout = {
    id: "22222222-2222-2222-2222-222222222222",
    user_id: profile.id,
    name: "Default",
    is_active: true,
    version: 1,
    created_at: now,
    updated_at: now,
  };

  const defs = [
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      key: "nutrition",
      display_name: "Breakfast",
      category: "nutrition",
      default_order: 0,
      visual_variant: "paper_yellow",
    }),
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      key: "workout",
      display_name: "Workout",
      category: "training",
      default_order: 1,
      visual_variant: "window_cyan",
    }),
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      key: "hydration",
      display_name: "Water",
      category: "lifestyle",
      default_order: 2,
      visual_variant: "window_blue",
    }),
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
      key: "meditation",
      display_name: "Meditation",
      category: "recovery",
      default_order: 3,
      visual_variant: "window_purple",
    }),
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5",
      key: "measurements",
      display_name: "Measurements",
      category: "body",
      default_order: 4,
      visual_variant: "paper_pink",
    }),
    moduleDef({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6",
      key: "progress_photos",
      display_name: "Profile",
      category: "body",
      default_order: 5,
      visual_variant: "window_pink",
    }),
  ];

  const cards = defs.map((definition, index) => {
    const n = String(index + 1);
    const userModule: UserModule = {
      id: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb${n}`,
      user_id: profile.id,
      module_definition_id: definition.id,
      enabled: true,
      custom_label: null,
      target_value: null,
      target_unit: null,
      created_at: now,
      updated_at: now,
    };
    const card: DashboardCard = {
      id: `cccccccc-cccc-cccc-cccc-ccccccccccc${n}`,
      dashboard_layout_id: layout.id,
      user_module_id: userModule.id,
      position_index: index,
      desktop_column: index % 3,
      desktop_row: Math.floor(index / 3),
      desktop_span: 1,
      tablet_position: index,
      mobile_position: index,
      rotation: 0,
      visual_variant: definition.visual_variant,
      created_at: now,
      updated_at: now,
    };
    const status: DailyModuleStatus = {
      id: `dddddddd-dddd-dddd-dddd-ddddddddddd${n}`,
      daily_record_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      user_module_id: userModule.id,
      status: "not_started",
      progress_value: null,
      progress_target: null,
      summary_text: null,
      completed_at: null,
      revision: 1,
      created_at: now,
      updated_at: now,
    };
    return {
      card,
      userModule,
      definition,
      status,
      title: definition.display_name,
      statusLabel: `${definition.display_name} · not started`,
    };
  });

  return {
    profile,
    layout,
    cards,
    localDate: "2026-07-26",
    dailyRecordId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    syncBanner: null,
    ...overrides,
  };
}
