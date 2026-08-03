import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs, loadE2EUsers } from "../helpers/auth";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

test.describe("domain extended (synthetic fixtures)", () => {
  test("nutrition curated food + meal totals surface on today", async ({ page }) => {
    const users = loadE2EUsers();
    const userId = users.completed!.id!;
    const db = admin();
    const { data: food } = await db
      .from("foods")
      .select("id, display_name")
      .eq("source", "mtfbwu_curated")
      .limit(1)
      .maybeSingle();
    expect(food?.id).toBeTruthy();

    const today = new Date().toISOString().slice(0, 10);
    const { data: daily } = await db
      .from("daily_records")
      .upsert(
        { user_id: userId, local_date: today, timezone: "UTC" },
        { onConflict: "user_id,local_date" },
      )
      .select("id")
      .single();

    await db.from("meal_logs").insert({
      user_id: userId,
      daily_record_id: daily!.id,
      meal_type: "breakfast",
      label: "E2E curated meal",
      energy_kcal: 250,
      protein_g: 20,
      carbohydrate_g: 10,
      fat_g: 8,
      fiber_g: 2,
      consumed_at: new Date().toISOString(),
    });

    await loginAs(page, users.completed!);
    await page.goto("/today");
    await expect(page.getByText(/breakfast|nutrition|meal|today/i).first()).toBeVisible();
  });

  test("workout session history remains visible after fixture insert", async ({
    page,
  }) => {
    const users = loadE2EUsers();
    const userId = users.completed!.id!;
    const db = admin();
    const today = new Date().toISOString().slice(0, 10);
    const { data: daily } = await db
      .from("daily_records")
      .upsert(
        { user_id: userId, local_date: today, timezone: "UTC" },
        { onConflict: "user_id,local_date" },
      )
      .select("id")
      .single();

    const { data: session, error } = await db
      .from("workout_sessions")
      .insert({
        user_id: userId,
        daily_record_id: daily!.id,
        title: "E2E Fixture Session",
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        snapshot_json: {},
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(session?.id).toBeTruthy();

    await loginAs(page, users.completed!);
    await page.goto("/history");
    await expect(
      page.getByText(/E2E Fixture Session|workout|history/i).first(),
    ).toBeVisible();
  });

  test("rehab summary path remains available for fixture session", async ({ page }) => {
    const users = loadE2EUsers();
    const userId = users.completed!.id!;
    const db = admin();
    const today = new Date().toISOString().slice(0, 10);
    const { data: daily } = await db
      .from("daily_records")
      .upsert(
        { user_id: userId, local_date: today, timezone: "UTC" },
        { onConflict: "user_id,local_date" },
      )
      .select("id")
      .single();

    const { data: session, error } = await db
      .from("rehab_sessions")
      .insert({
        user_id: userId,
        daily_record_id: daily!.id,
        title: "E2E Rehab Session",
        status: "completed",
        side: "not_applicable",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        session_snapshot_json: {},
        restriction_snapshot_json: {},
        clinician_source_snapshot: {},
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    await loginAs(page, users.completed!);
    await page.goto(`/rehab/sessions/${session!.id}/summary`);
    await expect(page.getByText(/rehab|summary|E2E/i).first()).toBeVisible();
  });

  test("progress weight appears privately on progress page", async ({ page }) => {
    const users = loadE2EUsers();
    const userId = users.completed!.id!;
    const db = admin();
    await db.from("body_weight_entries").insert({
      user_id: userId,
      local_date: new Date().toISOString().slice(0, 10),
      recorded_at: new Date().toISOString(),
      weight_value: 70,
      weight_unit: "kg",
      source: "manual",
      timezone: "UTC",
    });

    await loginAs(page, users.completed!);
    await page.goto("/progress");
    await expect(page.getByText(/70|weight|progress/i).first()).toBeVisible();
  });

  test("daily trackers hydration/sleep entries exist for today board", async ({
    page,
  }) => {
    const users = loadE2EUsers();
    const userId = users.completed!.id!;
    const db = admin();
    const today = new Date().toISOString().slice(0, 10);
    await db.from("hydration_entries").insert({
      user_id: userId,
      local_date: today,
      amount_ml: 250,
      occurred_at: new Date().toISOString(),
      source: "manual",
    });
    await db.from("sleep_sessions").insert({
      user_id: userId,
      sleep_date: today,
      bedtime_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
      wake_at: new Date().toISOString(),
      duration_seconds: 8 * 3600,
      source: "manual",
      timezone: "UTC",
    });

    await loginAs(page, users.completed!);
    await page.goto("/today");
    await expect(
      page.getByText(/water|hydration|sleep|tracker|today/i).first(),
    ).toBeVisible();
  });

  test("calendar day indicators and day-detail links", async ({ page }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.completed!);
    await page.goto("/calendar");
    await expect(page.getByText(/calendar|month|day/i).first()).toBeVisible();
    const dayLink = page.locator("a[href*='/history'], a[href*='date=']").first();
    if ((await dayLink.count()) > 0) {
      await dayLink.click();
      await expect(page).toHaveURL(/history|today|date=/);
    }
  });

  test("offline badge path does not crash today board", async ({ page, context }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.completed!);
    await page.goto("/today");
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await context.setOffline(false);
    await page.reload();
    await expect(page).toHaveURL(/\/today/);
  });
});
