"use client";

import { useState } from "react";
import { useAuth, type AuthDialogMode } from "@/context/auth";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;

/**
 * The sign-up / log-in form and the status notices. Shared by the dialog
 * (opened from the sidebar) and the full-screen gate, so the two can never
 * drift apart.
 */
export function StatusNotice({ mode }: { mode: "pending" | "disabled" }) {
  const { closeDialog } = useAuth();
  const { t } = useLang();
  const pending = mode === "pending";

  return (
    <div className="text-center pt-2">
      <div className="text-4xl mb-3" aria-hidden="true">{pending ? "⏳" : "⛔"}</div>
      <h2 id="auth-dialog-title" className="text-lg font-semibold mb-2">
        {pending ? t("auth.pendingTitle") : t("auth.disabledTitle")}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
        {pending ? t("auth.pendingBody") : t("auth.disabledBody")}
      </p>
      <button type="button" onClick={closeDialog} className="btn-primary w-full">
        {t("auth.ok")}
      </button>
    </div>
  );
}

export function AuthForm({
  mode,
  onSwitchMode,
  hint,
}: {
  mode: Exclude<AuthDialogMode, "pending" | "disabled">;
  /** The gate swaps the form in place; the dialog reopens itself in the other mode. */
  onSwitchMode?: (mode: Exclude<AuthDialogMode, "pending" | "disabled">) => void;
  /** Overrides the line under the title (the gate says why login is needed). */
  hint?: string;
}) {
  const { signUp, signIn, openDialog, signupTicket } = useAuth();
  const { t } = useLang();
  const switchMode = onSwitchMode ?? openDialog;
  const signup = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (signup && fullName.trim().length === 0) return setError("invalid_name");

    if (signup && password.length < MIN_PASSWORD) return setError("invalid_password");

    if (signup && password !== confirm) return setError("password_mismatch");

    setBusy(true);

    const result = signup ? await signUp({ fullName, phone, password }) : await signIn(phone, password);

    setBusy(false);

    // draft / disabled already switched the dialog to its notice.
    const handled = ["draft", "disabled", "already_signed_up"];

    if (!result.ok && !handled.includes(result.error)) setError(result.error);
  }

  const field = "block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 id="auth-dialog-title" className="text-lg font-semibold mb-1 pr-8">
        {signup ? t("auth.signupTitle") : t("auth.loginTitle")}
      </h2>
      <p className="text-sm text-zinc-500 mb-4">{signup ? t("auth.signupHint") : hint ?? t("auth.loginHint")}</p>

      <div className="space-y-3">
        {signup && (
          <div>
            <label htmlFor="auth-name" className={field}>{t("auth.name")}</label>
            <input
              id="auth-name"
              className="input"
              autoComplete="name"
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-phone" className={field}>{t("auth.phone")}</label>
          <input
            id="auth-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901 234 567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="auth-password" className={field}>{t("auth.password")}</label>
          <input
            id="auth-password"
            className="input"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? MIN_PASSWORD : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {signup && <p className="text-xs text-zinc-500 mt-1">{t("auth.passwordHint")}</p>}
        </div>
        {signup && (
          <div>
            <label htmlFor="auth-confirm" className={field}>{t("auth.confirmPassword")}</label>
            <input
              id="auth-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {t(`auth.error.${error}`) === `auth.error.${error}` ? t("auth.error.generic") : t(`auth.error.${error}`)}
        </p>
      )}

      <button type="submit" disabled={busy} className={cn("btn-primary w-full mt-4", busy && "opacity-60 cursor-wait")}>
        {busy ? t("auth.working") : signup ? t("auth.signupSubmit") : t("auth.loginSubmit")}
      </button>

      {/* Only one sign-up per browser, so a used ticket hides the way back to the form. */}
      {(signup || !signupTicket) && (
        <p className="text-sm text-center text-zinc-500 mt-4">
          {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <button
            type="button"
            onClick={() => switchMode(signup ? "login" : "signup")}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline py-2 -my-2"
          >
            {signup ? t("auth.toLogin") : t("auth.toSignup")}
          </button>
        </p>
      )}
    </form>
  );
}
