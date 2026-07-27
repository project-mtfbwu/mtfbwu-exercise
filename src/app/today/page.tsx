import type { Metadata } from "next";
import { TodayBoard } from "@/widgets/today-board/today-board";
import { loadBoardSnapshot } from "@/shared/board/load-board";

export const metadata: Metadata = {
  title: "Today",
};

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const snapshot = await loadBoardSnapshot(params.date);

  return (
    <article className="space-y-2">
      <TodayBoard snapshot={snapshot} />
    </article>
  );
}
