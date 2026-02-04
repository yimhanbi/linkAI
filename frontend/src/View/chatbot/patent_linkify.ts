export type PatentToken =
  | { type: "text"; value: string }
  | { type: "patent"; value: string; normalized: string };

const HYPHEN_APP_NO_REGEX: RegExp = /10\s*-\s*\d{4}\s*-\s*\d{6,7}/g;
const DIGITS_APP_NO_REGEX: RegExp = /\b10\d{10,11}\b/g;

export function normalizeApplicationNumber(raw: string): string {
  const digitsOnly: string = raw.replace(/[^\d]/g, "");
  return digitsOnly;
}

function isLikelyApplicationNumberDigits(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  return value.length === 12 || value.length === 13;
}

export function tokenizePatentNumbers(text: string): PatentToken[] {
  if (!text) return [{ type: "text", value: "" }];

  const matches: Array<{ start: number; end: number; raw: string }> = [];

  for (const m of text.matchAll(HYPHEN_APP_NO_REGEX)) {
    const raw: string = m[0];
    const start: number = m.index ?? -1;
    if (start < 0) continue;
    matches.push({ start, end: start + raw.length, raw });
  }

  for (const m of text.matchAll(DIGITS_APP_NO_REGEX)) {
    const raw: string = m[0];
    const start: number = m.index ?? -1;
    if (start < 0) continue;
    matches.push({ start, end: start + raw.length, raw });
  }

  if (matches.length === 0) return [{ type: "text", value: text }];

  // sort and de-dupe overlaps (prefer longer match)
  matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const merged: Array<{ start: number; end: number; raw: string }> = [];
  for (const m of matches) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(m);
      continue;
    }
    if (m.start < last.end) {
      // overlap: keep the longer one
      const lastLen: number = last.end - last.start;
      const curLen: number = m.end - m.start;
      if (curLen > lastLen) {
        merged[merged.length - 1] = m;
      }
      continue;
    }
    merged.push(m);
  }

  const tokens: PatentToken[] = [];
  let cursor: number = 0;
  for (const m of merged) {
    if (m.start > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, m.start) });
    }
    const normalized: string = normalizeApplicationNumber(m.raw);
    if (isLikelyApplicationNumberDigits(normalized)) {
      tokens.push({ type: "patent", value: m.raw, normalized });
    } else {
      tokens.push({ type: "text", value: m.raw });
    }
    cursor = m.end;
  }
  if (cursor < text.length) {
    tokens.push({ type: "text", value: text.slice(cursor) });
  }
  return tokens;
}

