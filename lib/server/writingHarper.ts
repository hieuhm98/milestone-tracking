import "server-only";
import type { LocalLinter } from "harper.js";

export interface WritingLint {
  start: number;
  end: number;
  /** Harper's category: Spelling, Grammar, Agreement, Punctuation, … */
  kind: string;
  message: string;
  suggestions: string[];
  text: string;
}

// One linter per server process: building it instantiates the WASM module.
const g = globalThis as unknown as { __harperLinter?: Promise<LocalLinter> };

function getLinter(): Promise<LocalLinter> {
  if (!g.__harperLinter) {
    g.__harperLinter = (async () => {
      const harper = await import("harper.js");
      const { binaryInlined: binary } = await import("harper.js/binaryInlined");

      return new harper.LocalLinter({ binary, dialect: harper.Dialect.American });
    })();
    // A failed start must not be cached forever.
    g.__harperLinter.catch(() => {
      g.__harperLinter = undefined;
    });
  }

  return g.__harperLinter;
}

export async function lintEssay(text: string): Promise<WritingLint[]> {
  const linter = await getLinter();
  const lints = await linter.lint(text);

  return lints
    .map((lint) => {
      const span = lint.span();

      return {
        start: span.start,
        end: span.end,
        kind: String(lint.lint_kind()),
        message: lint.message(),
        suggestions: lint
          .suggestions()
          .slice(0, 3)
          .map((s) => s.get_replacement_text()),
        text: text.slice(span.start, span.end),
      };
    })
    .sort((a, b) => a.start - b.start);
}
