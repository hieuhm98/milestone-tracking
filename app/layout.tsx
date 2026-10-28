import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milestone Tracking",
  description: "Track your milestones and IT knowledge",
};

/**
 * Without this a phone browser assumes a ~980px desktop layout and zooms out,
 * which no amount of responsive CSS can undo. `viewportFit: cover` lets the
 * safe-area insets below reach the notch/home-indicator area.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        {/* Set the theme class before first paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t!=='light')t='dark';var c=document.documentElement.classList;c.remove('light','dark');c.add(t);}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
