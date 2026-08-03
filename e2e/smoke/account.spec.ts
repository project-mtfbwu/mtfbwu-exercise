import { test, expect } from "@playwright/test";
import { loginAs, loadE2EUsers } from "../helpers/auth";

test.describe("account smoke", () => {
  test("export download boundary and deletion confirmation reject", async ({ page }) => {
    const users = loadE2EUsers();
    await loginAs(page, users.completed!);
    await page.goto("/settings");

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download export/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/mtfbwu-export-.*\.json/);

    await page.getByLabel("Confirmation").fill("delete");
    await expect(page.getByRole("button", { name: /delete my account/i })).toBeDisabled();

    // Do not destroy the shared completed fixture account.
    await page.getByLabel("Confirmation").fill("DELETE");
    await expect(page.getByRole("button", { name: /delete my account/i })).toBeEnabled();
  });
});
