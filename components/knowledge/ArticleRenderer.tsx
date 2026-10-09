"use client";

import { Children, createContext, useContext, useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  CALLOUT,
  KEY_TERM,
  accentTokens,
  paragraphKind,
  quoteKind,
  type Accent,
  type CalloutKind,
} from "./articleTokens";

interface Props {
  content: string;
  /** The course accent (lib/groups.ts) — colours headings, markers and tables. */
  accent?: Accent;
}

// Minimal hast shapes — only what the label detection below reads.
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  position?: { start: { offset?: number } };
}

/** The class a `**bold**` run gets where it sits: marker pen, callout label, or plain in a table. */
const StrongClass = createContext(KEY_TERM);

/** True inside a callout or list item, where a labelled paragraph must not become a second box. */
const Nested = createContext(false);

/**
 * Where the bold run that *opens* the current paragraph or bullet starts. That
 * run is a lead-in label ("Technique 1 — Follow the flow.") and takes the course
 * colour; bold further along the line is a key phrase and keeps the marker pen.
 */
const LeadOffset = createContext<number | null>(null);

function textOf(node: HastNode | undefined): string {
  if (!node) return "";

  if (node.type === "text") return node.value ?? "";

  return (node.children ?? []).map(textOf).join("");
}

/** The `<strong>` a block opens with (skipping the blank text a loose list leaves), if any. */
function leadingStrong(block: HastNode | undefined): HastNode | null {
  const first = block?.children?.find((child) => child.type !== "text" || child.value?.trim());

  return first?.type === "element" && first.tagName === "strong" ? first : null;
}

/** The text of the `<strong>` a paragraph opens with, or null when it opens with anything else. */
function leadingBold(paragraph: HastNode | undefined): string | null {
  const strong = leadingStrong(paragraph);

  return strong ? textOf(strong) : null;
}

function LeadScope({ block, children }: { block?: HastNode; children?: ReactNode }) {
  const strong = leadingStrong(block);
  const rest = (block?.children ?? []).filter((child) => child !== strong && textOf(child).trim());
  // A block that is bold from end to end is a key sentence (marker pen), unless
  // it ends in a colon — then it is a label for what follows.
  const isLabel = strong !== null && (rest.length > 0 || textOf(strong).trim().endsWith(":"));
  const offset = isLabel ? strong.position?.start.offset ?? null : null;

  return <LeadOffset.Provider value={offset}>{children}</LeadOffset.Provider>;
}

/**
 * What labels a blockquote: its opening bold run, or — for a quote written
 * without bold, like "> Example: …" — the plain text before an early colon.
 */
function quoteLabel(quote: HastNode | undefined): string | null {
  const paragraph = quote?.children?.find((child) => child.type === "element");
  const bold = leadingBold(paragraph);

  if (bold) return bold;

  const text = textOf(paragraph);
  const colon = text.indexOf(":");

  return colon > 0 && colon <= 40 ? text.slice(0, colon) : null;
}

function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }) {
  const tokens = CALLOUT[kind];
  const Icon = tokens.icon;

  return (
    <div className={cn("not-italic my-5 flex gap-3 rounded-r-xl border-l-4 px-3 py-3 sm:px-4", tokens.frame)}>
      <span
        className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", tokens.badge)}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <Nested.Provider value={true}>
          <StrongClass.Provider value={tokens.label}>{children}</StrongClass.Provider>
        </Nested.Provider>
      </div>
    </div>
  );
}

function Strong({ node, lead, children }: { node?: HastNode; lead: string; children?: ReactNode }) {
  const className = useContext(StrongClass);
  const leadOffset = useContext(LeadOffset);
  const isLead = className === KEY_TERM && leadOffset !== null && node?.position?.start.offset === leadOffset;

  return <strong className={isLead ? lead : className}>{children}</strong>;
}

function Paragraph({ node, children }: { node?: HastNode; children?: ReactNode }) {
  const nested = useContext(Nested);
  const kind = nested ? null : paragraphKind(leadingBold(node));

  const paragraph = (
    <p>
      <LeadScope block={node}>{children}</LeadScope>
    </p>
  );

  return kind ? <Callout kind={kind}>{paragraph}</Callout> : paragraph;
}

/** Splits "1. Who is a stakeholder?" into its number and title. */
function splitNumber(children: ReactNode): { number: string | null; rest: ReactNode[] } {
  const parts = Children.toArray(children);
  const head = parts[0];

  if (typeof head === "string") {
    const match = head.match(/^(\d+)\.\s+([\s\S]*)$/);

    if (match) return { number: match[1], rest: [match[2], ...parts.slice(1)] };
  }

  return { number: null, rest: parts };
}

export default function ArticleRenderer({ content, accent }: Props) {
  const components = useMemo<Components>(() => {
    const tokens = accentTokens(accent);

    return {
      h2: ({ children }) => {
        const { number, rest } = splitNumber(children);

        return (
          <h2 className={cn("flex items-start gap-3 border-b-2 pb-2", tokens.rule)}>
            {number ? (
              <span
                className={cn(
                  "mt-px inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold",
                  tokens.badge
                )}
                aria-hidden="true"
              >
                {number}
              </span>
            ) : (
              <span className={cn("mt-1 h-5 w-1.5 shrink-0 rounded-full", tokens.bar)} aria-hidden="true" />
            )}

            <span className="min-w-0">
              {number && <span className="sr-only">{number}. </span>}
              {rest}
            </span>
          </h2>
        );
      },
      h3: ({ node, className, ...props }) => <h3 className={cn(tokens.h3, className)} {...props} />,
      strong: ({ node, children }) => (
        <Strong node={node as HastNode} lead={cn("font-semibold", tokens.h3)}>
          {children}
        </Strong>
      ),
      p: ({ node, children }) => <Paragraph node={node as HastNode}>{children}</Paragraph>,
      blockquote: ({ node, children }) => (
        <Callout kind={quoteKind(quoteLabel(node as HastNode))}>{children}</Callout>
      ),
      ul: ({ node, className, ...props }) => <ul className={cn(tokens.marker, className)} {...props} />,
      ol: ({ node, className, ...props }) => (
        <ol className={cn("marker:font-bold", tokens.marker, className)} {...props} />
      ),
      li: ({ node, children, ...props }) => (
        <li {...props}>
          <Nested.Provider value={true}>
            <LeadScope block={node as HastNode}>{children}</LeadScope>
          </Nested.Provider>
        </li>
      ),
      // A wide table must scroll inside its own box; left alone it pushes
      // the whole article sideways on a phone. `<pre>` already gets this
      // from the prose plugin.
      table: ({ children }) => (
        <div className={cn("my-6 overflow-x-auto rounded-xl border", tokens.frame)}>
          <table className="!my-0">
            <StrongClass.Provider value="font-semibold">{children}</StrongClass.Provider>
          </table>
        </div>
      ),
      thead: ({ node, className, ...props }) => <thead className={cn(tokens.head, className)} {...props} />,
      tr: ({ node, className, ...props }) => (
        <tr className={cn("even:bg-zinc-50 dark:even:bg-zinc-900/50", className)} {...props} />
      ),
      hr: () => (
        <div role="separator" className={cn("my-8 h-0.5 rounded-full bg-gradient-to-r to-transparent", tokens.divider)} />
      ),
    };
  }, [accent]);

  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none
      prose-headings:font-bold
      prose-h1:text-2xl prose-h1:mb-4
      prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
      prose-p:leading-relaxed
      prose-code:text-blue-600 dark:prose-code:text-blue-300 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:break-words prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700 prose-pre:rounded-xl
      prose-table:text-sm
      prose-thead:border-b-0
      prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-th:text-inherit
      prose-td:px-3 prose-td:border-zinc-200 dark:prose-td:border-zinc-700
      prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-700 dark:hover:prose-a:text-blue-300
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
