// Deterministic crisis + concern detection. Errs on the side of safety
// without over-triggering on ordinary sadness words or common idioms
// ("killing me", "dying to see them", "to die for").

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill (myself|me)\b/i,
  /\bend (my |it all|my life)/i,
  /\btake my (own )?life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (be here|live|exist|wake up)\b/i,
  /\bwish i (was|were) dead\b/i,
  /\bbetter off dead\b/i,
  /\bself[- ]harm\b/i,
  // Intent / ongoing self-injury (replaces bare hurt/cut myself).
  /\b(want|wanting|going|plan|planning|thinking about|urge|urges) to (hurt|cut|harm) myself\b/i,
  /\b(hurting|cutting|harming) myself\b/i,
  /\b(hurt|cut) myself on purpose\b/i,
  // Explicit plans of harm.
  /\b(have|made|got) a plan to (die|kill|end|hurt)\b/i,
  /\bi'?m not safe\b/i,
  /\bnot safe (right now|tonight|anymore)\b/i,
  /\bin (immediate )?danger\b/i,
  /\bno reason to (live|go on)\b/i,
];

// Co-occurrence rule: "plan" mentioned alongside crisis-intent phrases.
const PLAN_WORD = /\bplan(s|ning|ned)?\b/i;
const PLAN_CO_OCCURRENCE = [
  /suicide/i,
  /kill myself/i,
  /end my life/i,
  /end it all/i,
  /not be here/i,
  /want to die/i,
  /better off dead/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (CRISIS_PATTERNS.some((rx) => rx.test(text))) return true;
  if (PLAN_WORD.test(text) && PLAN_CO_OCCURRENCE.some((rx) => rx.test(text))) {
    return true;
  }
  return false;
}

// Bare past-tense self-injury language that did NOT match crisis. Kept
// tight so accident context ("at the gym", "shaving") does not fire.
const CONCERN_PATTERNS: RegExp[] = [
  /^\s*i(?:'?ve)?\s+(?:just\s+)?(hurt|cut)\s+myself\.?\s*$/i,
];

export function detectConcern(text: string): boolean {
  if (!text) return false;
  if (detectCrisis(text)) return false;
  return CONCERN_PATTERNS.some((rx) => rx.test(text));
}
