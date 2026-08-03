import type { Metadata } from "next";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import {
  APP_IDENTITY,
  resolveBuildIdentifier,
  resolveReleaseVersion,
} from "@/shared/config/app-identity";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-[var(--mt-ink-inverse)]">
      <h1 className="text-3xl font-black">{APP_IDENTITY.product}</h1>
      <p>{APP_IDENTITY.description}</p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-bold">Version</dt>
          <dd>
            <code>{resolveReleaseVersion()}</code>
          </dd>
        </div>
        <div>
          <dt className="font-bold">Build</dt>
          <dd>
            <code>{resolveBuildIdentifier()}</code>
          </dd>
        </div>
        <div>
          <dt className="font-bold">Developer</dt>
          <dd>{APP_IDENTITY.author.name}</dd>
        </div>
        <div>
          <dt className="font-bold">Organization</dt>
          <dd>{APP_IDENTITY.organization.name}</dd>
        </div>
      </dl>
      <p>
        Not a journal, feed, or social network. Reminder delivery, wearables, and AI
        coaching are out of scope for this beta.
      </p>
      <p>
        <AppLink href={ROUTES.privacy}>Privacy</AppLink> ·{" "}
        <AppLink href={ROUTES.terms}>Terms</AppLink> ·{" "}
        <AppLink href={ROUTES.support}>Support</AppLink>
      </p>
    </article>
  );
}
