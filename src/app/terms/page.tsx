import type { Metadata } from "next";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { APP_IDENTITY } from "@/shared/config/app-identity";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-[var(--mt-ink-inverse)]">
      <h1 className="text-3xl font-black">Terms of use</h1>
      <p className="rounded border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-3 py-2 text-sm font-bold text-[var(--mt-ink)]">
        Requires legal review before public launch. Jurisdiction and liability language
        are placeholders.
      </p>
      <p>
        {APP_IDENTITY.product} is a personal tracking tool, not medical advice. Rehab
        modules support clinician-guided plans you enter; the app does not diagnose or
        prescribe. Supplement tracking is wellness logging only — no interaction checking.
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Third-party food databases may be incomplete or provisional.</li>
        <li>Beta availability is not an uptime guarantee.</li>
        <li>Abusive or illegal use may result in account termination.</li>
        <li>
          Reminder preferences may be saved without push/email delivery until a later
          release.
        </li>
      </ul>
      <p>
        Privacy: <AppLink href={ROUTES.privacy}>/privacy</AppLink>. Support:{" "}
        <AppLink href={ROUTES.support}>/support</AppLink>.
      </p>
    </article>
  );
}
