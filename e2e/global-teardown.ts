import fs from "node:fs";
import { E2E_FIXTURE_PATH } from "./global-setup";

export default async function globalTeardown() {
  // Keep fixture file for local debugging; CI workspace is ephemeral.
  if (process.env.CI && fs.existsSync(E2E_FIXTURE_PATH)) {
    fs.rmSync(E2E_FIXTURE_PATH, { force: true });
  }
}
