import type { Metadata } from "next";
import "@fontsource-variable/newsreader";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { TopBar, ExperimentBanner, Footer } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: { default: "Verdict - Ship the version that earned it", template: "%s - Verdict" },
  description: "A documentation assistant that screens its own improvements offline, tests them on real visitors with a Flagsmith experiment, and ships the winner through the same flag without a redeploy.",
};

const themeInit = `(function(){try{var m=localStorage.getItem("vd_theme")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <TopBar />
        <ExperimentBanner />
        <main id="main" className="flex w-full flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
