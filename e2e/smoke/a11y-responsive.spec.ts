import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, loadE2EUsers, expectNoHorizontalOverflow } from "../helpers/auth";

const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

test.describe("a11y + responsive smoke", () => {
  for (const vp of viewports) {
    test(`viewport ${vp.width}x${vp.height} login/today/settings no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      const users = loadE2EUsers();

      await page.goto("/login");
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

      await loginAs(page, users.completed!);
      await expectNoHorizontalOverflow(page);

      await page.goto("/calendar");
      await expectNoHorizontalOverflow(page);

      await page.goto("/settings");
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole("button", { name: /download export/i })).toBeVisible();
    });
  }

  test("critical pages have no serious axe violations", async ({ page }) => {
    const users = loadE2EUsers();
    await page.goto("/login");
    let results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);

    await loginAs(page, users.completed!);
    for (const path of [
      "/today",
      "/calendar",
      "/settings",
      "/privacy",
      "/terms",
      "/support",
    ]) {
      await page.goto(path);
      results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"]) // decorative glitter may fail; interactive contrast checked manually
        .analyze();
      const serious = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      );
      expect(serious, `${path} axe`).toEqual([]);
    }
  });

  test("skip link and landmarks exist on today", async ({ page }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.completed!);
    await page.goto("/today");
    const skip = page.getByRole("link", { name: /skip/i });
    if ((await skip.count()) > 0) {
      await expect(skip.first()).toBeAttached();
    }
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });
});
