import type { Metadata } from "next";
import { TodayBoard } from "@/widgets/today-board";

export const metadata: Metadata = {
  title: "Today",
};

export default function TodayPage() {
  return (
    <article className="space-y-2">
      <TodayBoard />
    </article>
  );
}
