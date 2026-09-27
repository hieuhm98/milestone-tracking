"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { AuthForm, StatusNotice } from "@/components/auth/AuthForm";

/** Sign-up, log-in, and the "waiting for approval" notice, in one modal. */
export default function AuthDialog() {
  const { dialog, closeDialog } = useAuth();
  const { t } = useLang();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dialog) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog, closeDialog]);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeDialog} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="card relative w-full max-w-sm shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <button
          type="button"
          onClick={closeDialog}
          aria-label={t("auth.close")}
          className="absolute top-2 right-2 p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>

        {dialog === "pending" || dialog === "disabled" ? <StatusNotice mode={dialog} /> : <AuthForm mode={dialog} />}
      </div>
    </div>
  );
}
