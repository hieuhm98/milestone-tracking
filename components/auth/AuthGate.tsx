"use client";

import { useState } from "react";
import { KeyRound, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { useTheme } from "@/context/theme";
import { AuthForm } from "@/components/auth/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { LANGS } from "@/lib/i18n";
import { isValidPassword, MAX_PASSWORD, MIN_PASSWORD } from "@/lib/password";
import { cn } from "@/lib/utils";

/**
 * Whether the site is closed to visitors. Set NEXT_PUBLIC_REQUIRE_LOGIN=0 to
 * open it up again. Without Supabase there is nothing to log in to, so the
 * site stays public rather than locking everyone — including local dev — out.
 */
export const REQUIRE_LOGIN = isSupabaseConfigured && process.env.NEXT_PUBLIC_REQUIRE_LOGIN !== "0";

/**
 * Nothing but the sign-in screen until an approved account is signed in.
 * This hides the app, not the content API routes — see local-docs.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, profile } = useAuth();

  // An admin set this password: ask about it before anything else, even on a
  // public site, so the admin's password doesn't quietly stay in use.
  if (profile?.must_change_password) return <ChangePasswordScreen />;

  if (!REQUIRE_LOGIN || profile) return <>{children}</>;

  // Don't flash the sign-in screen at someone who is already signed in.
  if (!ready) return <Splash />;

  return <SignInScreen />;
}

function Splash() {
  const { t } = useLang();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="font-bold text-lg tracking-tight">Milestone Tracking</div>
        <div className="mt-3 text-sm text-zinc-500" role="status">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      </div>
    </div>
  );
}

function SignInScreen() {
  const { t } = useLang();
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <GateFrame>
      <AuthForm mode={mode} onSwitchMode={setMode} hint={t("auth.loginHintRequired")} />
    </GateFrame>
  );
}

/**
 * Shown right after signing in with a password an admin set. The user picks a
 * new one or keeps the admin's; either answer clears the flag on the server.
 */
function ChangePasswordScreen() {
  const { profile, answerPasswordPrompt, signOut } = useAuth();
  const { pick } = useLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"change" | "keep" | null>(null);

  async function submit(choice: "change" | "keep") {
    setError(null);

    if (choice === "change") {
      if (!isValidPassword(password)) return setError("invalid_password");

      if (password !== confirm) return setError("password_mismatch");
    }

    setBusy(choice);

    const result = await answerPasswordPrompt(choice === "change" ? password : null);

    // On success the profile reloads without the flag and the gate lets them in.
    if (!result.ok) {
      setBusy(null);
      setError(result.error);
    }
  }

  const messages: Record<string, [string, string]> = {
    invalid_password: [
      `Mật khẩu cần từ ${MIN_PASSWORD} đến ${MAX_PASSWORD} ký tự.`,
      `The password needs ${MIN_PASSWORD} to ${MAX_PASSWORD} characters.`,
    ],
    password_mismatch: ["Hai mật khẩu không khớp.", "The two passwords don't match."],
    weak_password: ["Mật khẩu này quá yếu, hãy chọn mật khẩu khác.", "That password is too weak — pick another one."],
    network: ["Không kết nối được máy chủ. Thử lại nhé.", "Couldn't reach the server. Please try again."],
  };
  const fallback: [string, string] = ["Có lỗi xảy ra, vui lòng thử lại.", "Something went wrong — please try again."];
  const [messageVi, messageEn] = error ? messages[error] ?? fallback : fallback;
  const message = error ? pick(messageVi, messageEn) : null;
  const field = "block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300";

  return (
    <GateFrame>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit("change");
        }}
        noValidate
      >
        <KeyRound className="h-8 w-8 mb-2 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold mb-1">{pick("Đổi mật khẩu", "Change your password")}</h2>
        <p className="text-sm text-zinc-500 mb-4">
          {pick(
            `Chào ${profile?.full_name ?? ""}, quản trị viên vừa đặt mật khẩu mới cho tài khoản của bạn. Bạn có thể đặt mật khẩu của riêng mình, hoặc giữ mật khẩu vừa dùng để đăng nhập.`,
            `Hi ${profile?.full_name ?? ""}, an admin set a new password for your account. You can choose your own now, or keep the one you just signed in with.`
          )}
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="new-password" className={field}>{pick("Mật khẩu mới", "New password")}</label>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-zinc-500 mt-1">
              {pick(`Tối thiểu ${MIN_PASSWORD} ký tự.`, `At least ${MIN_PASSWORD} characters.`)}
            </p>
          </div>
          <div>
            <label htmlFor="confirm-new-password" className={field}>{pick("Nhập lại mật khẩu mới", "Confirm new password")}</label>
            <input
              id="confirm-new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {message}
          </p>
        )}

        <button type="submit" disabled={busy !== null} className={cn("btn-primary w-full mt-4", busy === "change" && "opacity-60 cursor-wait")}>
          {busy === "change" ? pick("Đang lưu…", "Saving…") : pick("Đổi mật khẩu", "Change password")}
        </button>
        <button
          type="button"
          onClick={() => void submit("keep")}
          disabled={busy !== null}
          className={cn("btn-secondary w-full mt-2", busy === "keep" && "opacity-60 cursor-wait")}
        >
          {busy === "keep" ? pick("Đang lưu…", "Saving…") : pick("Giữ mật khẩu hiện tại", "Keep current password")}
        </button>

        <p className="text-sm text-center text-zinc-500 mt-4">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline py-2 -my-2"
          >
            {pick("Đăng xuất", "Sign out")}
          </button>
        </p>
      </form>
    </GateFrame>
  );
}

/** Brand, a card for the form, and the language + theme toggles. */
function GateFrame({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t, pick } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <header className="text-center">
        <h1 className="font-bold text-2xl tracking-tight">Milestone Tracking</h1>
        <p className="text-sm text-zinc-500 mt-1">IT · AWS · English</p>
      </header>

      <div className="card w-full max-w-sm shadow-sm">{children}</div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label={pick("Ngôn ngữ", "Language")}
          className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              className={cn(
                "text-xs font-medium px-3 py-2 rounded-md transition-colors",
                lang === l.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {l.short}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
          className="inline-flex items-center justify-center text-sm px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
