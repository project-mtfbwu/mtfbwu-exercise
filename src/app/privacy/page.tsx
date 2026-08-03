import type { Metadata } from "next";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { APP_IDENTITY } from "@/shared/config/app-identity";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-[var(--mt-ink-inverse)]">
      <h1 className="text-3xl font-black">Privacy</h1>
      <p className="rounded border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-3 py-2 text-sm font-bold text-[var(--mt-ink)]">
        Requires legal review before public launch. This page is a product draft, not
        lawyer-approved counsel.
      </p>
      <p>
        {APP_IDENTITY.product} stores personal fitness and training records you enter. We
        do not sell personal data. Private progress photos and nutrition label images stay
        in private storage with owner-only access.
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Camera is used only for barcode scanning and optional progress photos.</li>
        <li>
          Barcode lookups may call Open Food Facts; USDA FoodData Central is queried
          server-side with an API key that never ships to the browser.
        </li>
        <li>Private photos are not used for AI training.</li>
        <li>
          You can export a data summary and request account deletion from{" "}
          <AppLink href={ROUTES.settings}>Settings</AppLink>.
        </li>
        <li>
          Local storage / IndexedDB holds offline drafts on your device and is cleared on
          sign-out where implemented.
        </li>
        <li>
          Optional analytics are off by default and never send meal or body contents.
        </li>
      </ul>
      <p>
        Contact: see <AppLink href={ROUTES.support}>Support</AppLink>.
      </p>
    </article>
  );
}
