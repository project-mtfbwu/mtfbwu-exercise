import type { Metadata } from "next";
import { MotionDevToggle } from "@/widgets/today-board/motion-dev-toggle";
import { SignOutButton } from "@/widgets/auth/sign-out-button";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { APP_IDENTITY, resolveBuildIdentifier } from "@/shared/config/app-identity";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await loadProfileOrRedirect();
  const buildId = resolveBuildIdentifier();

  return (
    <article className="mx-auto max-w-2xl space-y-6 py-4">
      <SyncStatusBanner />
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-[var(--mt-ink-inverse)]">Settings</h1>
        <p className="max-w-prose text-[var(--mt-ink-inverse)]/85">
          Session, motion, and board preferences. Domain exports arrive later.
        </p>
      </header>

      <RetroWindow title="Account" accent="cyan">
        <PaperCard>
          <p className="text-sm text-[var(--mt-ink)]">
            Signed in as <strong>{profile.display_name || "athlete"}</strong>. Sign-out
            clears local Dexie outbox data (never passwords).
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </PaperCard>
      </RetroWindow>

      <section
        aria-labelledby="motion-settings-heading"
        className="mt-paper-panel space-y-3"
      >
        <h2
          id="motion-settings-heading"
          className="text-xl font-bold text-[var(--mt-ink-inverse)]"
        >
          Motion preference (browser)
        </h2>
        <p className="text-sm text-[var(--mt-ink-inverse)]/80">
          Local override: <code>full</code>, <code>reduced</code>, <code>off</code>.
          Profile default is <strong>{profile.animation_mode}</strong>.
        </p>
        <MotionDevToggle />
      </section>

      <RetroWindow title="Application information" accent="orange">
        <PaperCard>
          <dl className="space-y-2 text-sm text-[var(--mt-ink)]">
            <div>
              <dt className="font-semibold">Product</dt>
              <dd>{APP_IDENTITY.product}</dd>
            </div>
            <div>
              <dt className="font-semibold">Developer</dt>
              <dd>{APP_IDENTITY.author.name}</dd>
            </div>
            <div>
              <dt className="font-semibold">Organization</dt>
              <dd>{APP_IDENTITY.organization.name}</dd>
            </div>
            <div>
              <dt className="font-semibold">Version</dt>
              <dd>{APP_IDENTITY.version}</dd>
            </div>
            <div>
              <dt className="font-semibold">Build / commit</dt>
              <dd>
                <code>{buildId}</code>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[var(--mt-ink-muted)]">
            Application metadata identifies the product. It does not replace Windows
            Authenticode signing for desktop packages.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <AppLink href={APP_IDENTITY.privacyUrl}>Privacy</AppLink>
              <span className="text-[var(--mt-ink-muted)]"> (policy forthcoming)</span>
            </li>
            <li>
              <a
                className="underline"
                href={APP_IDENTITY.supportUrl}
                rel="noreferrer"
                target="_blank"
              >
                Support / issues
              </a>
            </li>
          </ul>
          <p id="privacy" className="mt-4 text-sm text-[var(--mt-ink)]">
            MTFBWU stores personal training and health-tracking data privately under your
            account. Progress photos and exports follow later increments with strict path
            RLS.
          </p>
        </PaperCard>
      </RetroWindow>

      <p className="text-sm text-[var(--mt-ink-inverse)]/80">
        <AppLink href={ROUTES.customize}>Customize board layout</AppLink>
      </p>
    </article>
  );
}
