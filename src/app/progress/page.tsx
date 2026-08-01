import type { Metadata } from "next";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { todayLocalDate } from "@/shared/utils/local-date";
import { loadProgressTimeline } from "@/modules/progress/timeline-loader";
import { loadSummaryPreferencesAction } from "@/modules/progress/summary-preferences";
import { listComparisonsAction } from "@/modules/progress/comparison-actions";
import {
  describeWeightChangeAction,
  getWeightChartDataAction,
} from "@/modules/measurements/actions";
import { listPhotoSetsAction } from "@/modules/progress-photos/actions";
import { ProgressPageClient } from "@/widgets/progress/progress-page-client";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { profile } = await loadProfileOrRedirect();
  const localDate = todayLocalDate(profile.timezone);
  const preferences = await loadSummaryPreferencesAction();
  const timeline = await loadProgressTimeline({});
  const comparisons = await listComparisonsAction();
  const { points: chartPoints } = await getWeightChartDataAction(
    localDate,
    preferences.defaultDateRange,
  );
  const { summary } = await describeWeightChangeAction(
    localDate,
    preferences.defaultDateRange,
  );

  const photoSets = await listPhotoSetsAction(50);

  return (
    <article className="space-y-2">
      <SyncStatusBanner />
      <ProgressPageClient
        timeline={timeline}
        preferences={preferences}
        comparisons={comparisons}
        photoSets={photoSets}
        chartPoints={chartPoints}
        weightTrend={summary.trendText}
        localDate={localDate}
        timezone={profile.timezone}
      />
    </article>
  );
}
