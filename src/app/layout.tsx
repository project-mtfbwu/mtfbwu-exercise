import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/shared/providers/app-providers";
import { SiteNav } from "@/widgets/navigation/site-nav";
import { APP_NAME, APP_TAGLINE } from "@/shared/config/constants";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — Today`,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_TAGLINE} Personal body-and-training tracker. Not medical advice.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#12082A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="mt-shell">
            <a
              href="#main"
              className="sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:block focus:h-auto focus:w-auto focus:bg-[var(--mt-neon-yellow)] focus:px-3 focus:py-2 focus:text-[var(--mt-ink)] focus:[clip:auto]"
            >
              Skip to content
            </a>
            <SiteNav />
            <main id="main" className="mt-main">
              {children}
            </main>
            <div className="mt-checker-footer" aria-hidden />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
