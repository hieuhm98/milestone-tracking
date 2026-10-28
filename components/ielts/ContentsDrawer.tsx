"use client";

// The table-of-contents drawer below lg, shared by the IELTS Speaking and the
// Grammar for Writing shells. It behaves like a modal dialog: opening moves
// focus to its close button, Tab stays inside it, Escape or a tap on the
// backdrop closes it, and focus goes back to whatever opened it. Closed, it is
// unmounted, so none of its links are in the tab order.

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ContentsDrawer({ open, onClose, title, closeLabel, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // The shells pass an inline arrow; a ref keeps the effect from re-running
  // (and re-grabbing focus) on every render.
  const closeRef = useRef(onClose);
  const titleId = useId();

  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    // The drawer only exists below lg; growing past it must not leave the page locked.
    const wide = window.matchMedia("(min-width: 1024px)");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();

        return;
      }

      if (event.key !== "Tab" || !panel.current) return;

      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onWide = (event: MediaQueryListEvent) => {
      if (event.matches) closeRef.current();
    };

    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onWide);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onWide);

      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] overflow-y-auto overscroll-contain border-l border-zinc-200 bg-zinc-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-xl dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>

          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1.5 rounded-md p-2.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </>
  );
}
