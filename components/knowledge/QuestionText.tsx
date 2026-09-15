import { Fragment } from "react";

// Renders quiz text that may carry code. Question banks are plain JSON strings,
// so code is marked with single backticks: a span containing a newline is a code
// block, one without is inline code. Everything else renders as-is.
//
// Only inline elements are returned (block code is a `display: block` span), so
// this can sit inside the <p> and <button> wrappers the quiz surfaces already use.

interface Props {
  text?: string;
}

const CODE_SPAN = /`([^`]+)`/g;

export default function QuestionText({ text = "" }: Props) {
  if (!text.includes("`")) return <>{text}</>;

  const parts: JSX.Element[] = [];
  const pattern = new RegExp(CODE_SPAN.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const code = match[1];

    if (start > last) parts.push(<Fragment key={`t${start}`}>{trimAroundBlock(text.slice(last, start))}</Fragment>);

    if (code.includes("\n")) {
      parts.push(
        <span
          key={`c${start}`}
          className="block my-2 overflow-x-auto whitespace-pre rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3 py-2 font-mono text-[0.8125rem] font-normal leading-relaxed"
        >
          {code}
        </span>
      );
    } else {
      parts.push(
        <code
          key={`c${start}`}
          className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[0.9em] font-normal"
        >
          {code}
        </code>
      );
    }

    last = start + match[0].length;
  }

  if (last < text.length) parts.push(<Fragment key="tail">{trimAroundBlock(text.slice(last))}</Fragment>);

  return <>{parts}</>;
}

/** A code block already breaks the line, so the newline written before it would add a gap. */
function trimAroundBlock(segment: string) {
  return segment.replace(/\n+$/, "").replace(/^\n+/, "");
}
