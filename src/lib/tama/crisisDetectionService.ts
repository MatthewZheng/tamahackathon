// Deterministic crisis detection. Errs on the side of safety without over-triggering
// on ordinary sadness words like "sad" or "lonely".

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill (myself|me)\b/i,
  /\bend (my |it all|my life)/i,
  /\btake my (own )?life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (be here|live|exist|wake up)\b/i,
  /\bwish i (was|were) dead\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[- ]harm\b/i,
  /\bcut(ting)? myself\b/i,
  /\bi have a plan\b/i,
  /\bi'?m not safe\b/i,
  /\bnot safe (right now|tonight|anymore)\b/i,
  /\bin (immediate )?danger\b/i,
  /\bno reason to (live|go on)\b/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_PATTERNS.some((rx) => rx.test(t));
}
