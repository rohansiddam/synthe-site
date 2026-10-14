import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Synthe",
  description:
    "The trust layer for AI agents. Agents propose. You approve. Synthe commits.",
};

/* Runs before first paint so there is no flash of the wrong theme.
   Order: stored choice, then prefers-color-scheme, then dark. */
const themeInitScript = `(function(){try{var s=localStorage.getItem('synthe-theme');var t=s||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var h=document.documentElement;h.setAttribute('data-theme',t);h.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${hanken.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <body className="min-h-full bg-bg font-sans text-ink flex flex-col">
        {children}
      </body>
    </html>
  );
}
