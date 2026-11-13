import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { SiteHead } from "./components/SiteHead";
import { BackToTop } from "./components/BackToTop";
import { SmoothScroll } from "./components/SmoothScroll";
import { TendrilField } from "./components/tendrils/TendrilField";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://synthe.live"),
  icons: {
    icon: [
      { url: "/favicon.svg?v=5", type: "image/svg+xml" },
      { url: "/favicon-32x32.png?v=5", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180" }],
  },
  openGraph: { siteName: "Synthe", type: "website" },
  twitter: { card: "summary_large_image" },
};

/* The static pages' content security policy, kept verbatim. */
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://formspree.io; form-action 'self' https://formspree.io mailto:; base-uri 'self'; object-src 'none'; upgrade-insecure-requests";

/* Set the theme and the js class before first paint, exactly as the static
   pages did: a saved choice wins; otherwise the system theme; the palette
   flips instantly because transitions are suppressed while setting. */
const THEME_INIT = `document.documentElement.classList.add("js");
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem("synthe-theme");
  } catch (e) {
    theme = null;
  }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  try {
    if (localStorage.getItem("synthe-motion") === "paused") {
      document.documentElement.classList.add("motion-paused");
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The theme-init script must be a real element inside <head>: as a
            child of <html> outside <head>, React relocated it to the top of
            <body> in the export, where its execution depends on that
            relocation instead of the document order guaranteeing it runs
            before first paint. In <head> it is a blocking script: it sets
            data-theme and the js class before the body is parsed. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <link
          rel="preload"
          href="/fonts/archivo-normal-62-125-100-900-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <div className="page">
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <SiteHead />
            {children}
            <BackToTop />
          </div>
          <SmoothScroll />
          <TendrilField />
        </Providers>
      </body>
    </html>
  );
}
