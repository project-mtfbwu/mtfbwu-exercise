import { test, expect } from "@playwright/test";
import { loginAs, loadE2EUsers } from "../helpers/auth";

test.describe("auth smoke", () => {
  test("login, protected redirect, session persists, logout", async ({ page }) => {
    const users = loadE2EUsers();
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);

    await loginAs(page, users.completed!);
    await expect(page).toHaveURL(/\/today/);

    await page.reload();
    await expect(page).toHaveURL(/\/today/);

    await page.goto("/settings");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("safe next redirect accepted; external next rejected", async ({
    page,
    context,
  }) => {
    const users = loadE2EUsers();
    await page.goto("/login?next=/settings");
    await page.getByLabel("Email").fill(users.completed!.email);
    await page.getByLabel("Password").fill(users.completed!.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/settings/);

    await context.clearCookies();
    await page.goto("/login?next=https://evil.example");
    await page.getByLabel("Email").fill(users.completed!.email);
    await page.getByLabel("Password").fill(users.completed!.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/today/);
  });
});
