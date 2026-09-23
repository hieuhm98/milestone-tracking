"use client";

import { ThemeProvider } from "@/context/theme";
import { LanguageProvider } from "@/context/lang";
import { AuthProvider } from "@/context/auth";
import { ProgressProvider } from "@/context/progress";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProgressProvider>
            {/* Column on mobile so the top bar stacks above the page; the rail
                only becomes a sibling column at lg. `min-w-0` is what stops a
                wide child (a table, a long token) from pushing the whole page
                sideways instead of scrolling inside its own box. */}
            <div className="flex min-h-screen flex-col lg:flex-row">
              <Sidebar />
              <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {children}
              </main>
            </div>
          </ProgressProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
