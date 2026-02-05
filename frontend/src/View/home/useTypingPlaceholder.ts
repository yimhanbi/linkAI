import { useEffect, useState } from "react";

const PHRASES = [
  "이 기술, 기존 특허랑 겹치나요?",
  "이 아이디어로 특허 낼 수 있을까요?",
  "이 특허, 실제로 쓸 수 있는 시장이 있나요?",
];

const TYPING_INTERVAL_MS = 80;
const HOLD_AFTER_PHRASE_MS = 2200;
const DELETE_INTERVAL_MS = 40;

/**
 * Cycles through phrases with a typewriter effect: type out → hold → delete → next.
 * Returns the current display string for the placeholder.
 */
export function useTypingPlaceholder(): string {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayLength, setDisplayLength] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  const phrase = PHRASES[phraseIndex] ?? "";
  const displayText = phrase.slice(0, displayLength);

  useEffect(() => {
    if (phase === "typing") {
      if (displayLength < phrase.length) {
        const t = setTimeout(() => setDisplayLength((n) => n + 1), TYPING_INTERVAL_MS);
        return () => clearTimeout(t);
      }
      setPhase("hold");
      return undefined;
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("deleting"), HOLD_AFTER_PHRASE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "deleting") {
      if (displayLength > 0) {
        const t = setTimeout(() => setDisplayLength((n) => n - 1), DELETE_INTERVAL_MS);
        return () => clearTimeout(t);
      }
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
      setPhase("typing");
      return undefined;
    }
    return undefined;
  }, [phase, displayLength, phrase.length]);

  return displayText;
}
