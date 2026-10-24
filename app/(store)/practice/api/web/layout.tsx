"use client";

import { ThemeProvider } from "@/context/theme";
import { LanguageProvider } from "@/context/lang";
import { AuthProvider } from "@/context/auth";
import AuthGate from "@/components/auth/AuthGate";
import { StoreProvider } from "@/components/store/StoreContext";
import { StoreShell } from "@/components/store/StoreShell";

// The web store at /practice/api/web: a full-page shop (no app sidebar) that
// talks to the learner's API sandbox. It still sits behind the site's login
// gate — the sandbox key comes from the learner's account.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthGate>
            <StoreProvider>
              <StoreShell>{children}</StoreShell>
            </StoreProvider>
          </AuthGate>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
