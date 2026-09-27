"use client";

// A word with its British IPA underneath, like the source.
// `ruby-position: under` is what puts the <rt> below instead of above; the
// -webkit- property is kept for older WebKit.
//
// The answer paragraph opens its line spacing up when IPA is showing (see
// AnswerBlock) — at normal spacing the transcriptions collide with the line
// below and the whole answer becomes hard to read.

import { IPA_TEXT } from "./tokens";
import { useReaderSettings } from "./settings";

/** The source stores the slashes ("/ˈeseɪz/"); don't print a second pair. */
export function formatIpa(ipa: string): string {
  const trimmed = ipa.trim();

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}

export default function IpaWord({ word, ipa }: { word: string; ipa: string }) {
  const [settings] = useReaderSettings();

  if (!settings.ipa) return <>{word}</>;

  return (
    // `whitespace-nowrap` keeps the word and its transcription together: the
    // annotation is wider than the word, and the page's global
    // `overflow-wrap: break-word` otherwise splits "opportunity" — and its IPA
    // — across two lines. The line can still break before or after the ruby.
    <ruby className="whitespace-nowrap [overflow-wrap:normal] [-webkit-ruby-position:under] [ruby-position:under]">
      {word}
      <rt className={`text-[0.72em] font-normal leading-tight tracking-tight ${IPA_TEXT}`}>
        {formatIpa(ipa)}
      </rt>
    </ruby>
  );
}
