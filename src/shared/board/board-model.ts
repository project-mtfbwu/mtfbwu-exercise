import type {
  CardVisualVariant,
  DailyModuleStatus,
  DailyModuleStatusKind,
  DashboardCard,
  DashboardLayout,
  ModuleDefinition,
  Profile,
  UserModule,
} from "@/shared/database/types";

export type BoardCardView = {
  card: DashboardCard;
  userModule: UserModule;
  definition: ModuleDefinition;
  status: DailyModuleStatus | null;
  title: string;
  statusLabel: string;
};

export type BoardSnapshot = {
  profile: Profile;
  layout: DashboardLayout;
  cards: BoardCardView[];
  localDate: string;
  dailyRecordId: string;
  syncBanner: string | null;
};

export function labelForStatus(
  definition: ModuleDefinition,
  status: DailyModuleStatus | null,
  customLabel: string | null,
): string {
  const title = customLabel?.trim() || definition.display_name;
  if (!status || status.status === "not_started") {
    return `${title} · not started`;
  }
  if (status.summary_text) return status.summary_text;
  return `${title} · ${status.status.replace("_", " ")}`;
}

export function variantToFlatLay(variant: CardVisualVariant): {
  kind: "paper" | "window";
  paperTone?: "cream" | "yellow" | "pink";
  windowAccent?: "cyan" | "purple" | "pink" | "orange" | "lime" | "blue";
} {
  switch (variant) {
    case "paper_yellow":
      return { kind: "paper", paperTone: "yellow" };
    case "paper_pink":
      return { kind: "paper", paperTone: "pink" };
    case "window_cyan":
      return { kind: "window", windowAccent: "cyan" };
    case "window_purple":
      return { kind: "window", windowAccent: "purple" };
    case "window_pink":
      return { kind: "window", windowAccent: "pink" };
    case "window_orange":
      return { kind: "window", windowAccent: "orange" };
    case "window_lime":
      return { kind: "window", windowAccent: "lime" };
    case "window_blue":
      return { kind: "window", windowAccent: "blue" };
    case "paper_cream":
    default:
      return { kind: "paper", paperTone: "cream" };
  }
}

export function nextStatusAfterDemoSave(
  current: DailyModuleStatusKind | null,
): DailyModuleStatusKind {
  if (current === "completed") return "completed";
  return "completed";
}

/**
 * Conflict rules (Increment 3):
 * - Layout: expectedVersion must match; RPC bumps version or raises layout_version_conflict.
 * - Daily status: expectedRevision must match; completed cannot be wiped to not_started by stale offline writes.
 */
export function isLayoutConflictError(message: string): boolean {
  return message.toLowerCase().includes("layout_version_conflict");
}

export function isStatusConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("status_revision_conflict") || m.includes("status_completed_protected")
  );
}
