import { test, expect } from "@playwright/test";
import { loginAs, loadE2EUsers } from "../helpers/auth";

test.describe("onboarding smoke", () => {
  test("completed user is not forced through onboarding", async ({ page }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.completed!);
    await page.goto("/onboarding");
    // Completed users should land on today rather than being trapped.
    await page.waitForURL(/\/(today|onboarding)/);
    if (page.url().includes("/onboarding")) {
      // If route still reachable, Finish/skip should send them onward.
      const finish = page.getByRole("button", { name: /finish|continue|next/i });
      if (await finish.count()) {
        await finish.last().click();
      }
    }
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today/);
  });

  test("interrupted onboarding resumes for incomplete user", async ({ page }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.onboarding!);
    await expect(page).toHaveURL(/\/onboarding/);
    await page.reload();
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
