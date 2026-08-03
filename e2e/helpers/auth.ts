import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { E2E_FIXTURE_PATH, type E2EUser } from "../global-setup";

export function loadE2EUsers(): Record<string, E2EUser> {
  return JSON.parse(fs.readFileSync(E2E_FIXTURE_PATH, "utf8")) as Record<string, E2EUser>;
}

export async function loginAs(page: Page, user: E2EUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(today|onboarding)/);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow).toBe(false);
}
