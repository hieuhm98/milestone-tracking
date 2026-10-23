import { Fragment, type ReactNode } from "react";

// The light markup the SQL challenge texts use: blank-line paragraphs, "- "
// bullet lists, `code` and **bold**. Small on purpose — a full Markdown
// renderer would be overkill for a few sentences.

function inline(text: string): ReactNode[] {
  // Bold first, so `code` inside **bold** is parsed by the recursive call.
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1 && !part.startsWith("**")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[0.85em] font-mono text-zinc-800 dark:text-zinc-200 break-words"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {inline(part.slice(2, -2))}
        </strong>
      );
    }

    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);

  return (
    <div className={className ?? "space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");

        if (lines.every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((line, k) => (
                <li key={k}>{inline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
