import type { Metadata } from "next";
import { loadBoardSnapshot } from "@/shared/board/load-board";
import { CustomizeBoardClient } from "@/widgets/customize/customize-board-client";
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
    />
  );
}
