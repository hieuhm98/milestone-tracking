"use client";

// A word with its British IPA in small grey type underneath, like the source.
// `ruby-position: under` is what puts the <rt> below instead of above; the
// -webkit- property is kept for older WebKit.

import { IPA_TEXT } from "./tokens";
import { useReaderSettings } from "./settings";

export default function IpaWord({ word, ipa }: { word: string; ipa: string }) {
  const [settings] = useReaderSettings();

  if (!settings.ipa) return <>{word}</>;

  return (
    <ruby className="[-webkit-ruby-position:under] [ruby-position:under]">
      {word}
      <rt className={`text-[0.6em] font-normal tracking-tight ${IPA_TEXT}`}>/{ipa}/</rt>
    </ruby>
  );
}
