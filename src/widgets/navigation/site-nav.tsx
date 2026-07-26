"use client";

import { usePathname } from "next/navigation";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { cn } from "@/shared/utils/cn";

const links = [
  { href: ROUTES.today, label: "Today" },
  { href: ROUTES.calendar, label: "Calendar" },
  { href: ROUTES.plans, label: "Plans" },
  { href: ROUTES.progress, label: "Progress" },
  { href: ROUTES.profile, label: "Profile" },
  { href: ROUTES.import, label: "Import" },
  { href: ROUTES.settings, label: "Settings" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b-2 border-[var(--mt-neon-pink)] bg-[rgb(18_8_42_/0.92)] backdrop-blur">
      <div className="mx-auto flex w-min max-w-6xl flex-col gap-3 px-4 py-4 sm:w-full sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--mt-neon-yellow)] uppercase">
            MTFBWU
          </p>
          <p className="text-sm text-[var(--mt-ink-inverse)]/80">
            Increment 1 foundation shell
          </p>
        </div>
        <nav aria-label="Primary">
          <ul className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <AppLink
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-[var(--mt-radius-sm)] border-2 px-3 text-sm no-underline",
                      active
                        ? "border-[var(--mt-neon-lime)] bg-[var(--mt-paper)] text-[var(--mt-ink)]"
                        : "border-[var(--mt-ink-inverse)]/30 text-[var(--mt-ink-inverse)]",
                    )}
                  >
                    {link.label}
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
