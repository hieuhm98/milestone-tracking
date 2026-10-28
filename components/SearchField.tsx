"use client";

// The search box used above a list that filters as you type: the course
// curriculum and the English contents trees. Escape or the × clears it.

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Label of the clear button. */
  clearLabel: string;
  className?: string;
}

export default function SearchField({ value, onChange, placeholder, clearLabel, className }: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      />

      <input
        ref={input}
        type="text"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            // The button disappears once the box is empty; keep the keyboard in the field.
            input.current?.focus();
          }}
          aria-label={clearLabel}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
