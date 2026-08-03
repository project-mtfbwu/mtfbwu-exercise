import type { Metadata } from "next";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import {
  APP_IDENTITY,
  resolveBuildIdentifier,
  resolveReleaseVersion,
} from "@/shared/config/app-identity";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@example.com";
  const build = resolveBuildIdentifier();
  const version = resolveReleaseVersion();

  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-[var(--mt-ink-inverse)]">
      <h1 className="text-3xl font-black">Support</h1>
      <p>
        Contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> for account,
        privacy, or bug reports. Include category: account / privacy / bug / other.
      </p>
      <p className="text-sm">
        Version <code>{version}</code> · Build <code>{build}</code>
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Privacy or deletion requests:{" "}
          <AppLink href={ROUTES.settings}>Settings → Account</AppLink> or email support.
        </li>
        <li>Bug reports: steps to reproduce, browser, and whether you were offline.</li>
        <li>
          Product issues tracker: <a href={APP_IDENTITY.bugs}>{APP_IDENTITY.bugs}</a>
        </li>
      </ul>
      <p>
        <AppLink href={ROUTES.about}>About</AppLink> ·{" "}
        <AppLink href={ROUTES.privacy}>Privacy</AppLink> ·{" "}
        <AppLink href={ROUTES.terms}>Terms</AppLink>
      </p>
    </article>
  );
}
