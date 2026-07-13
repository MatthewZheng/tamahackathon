export type SpriteState = "idle" | "perked" | "sleepy" | "low" | "celebrating";

export type OverlayState = "collapsed" | "expanded" | "activity" | "hidden";
export type OverlayCorner = "br" | "bl" | "tr" | "tl";

export type WellbeingState = {
  rest: number;
  body: number;
  spark: number;
};

export type ConversationMessage = {
  id: string;
  from: "pocket" | "user";
  text: string;
  at: string;
};

export type QuickResponse = { key: "A" | "B" | "C"; label: string };

export type InferenceCategory =
  | "rest"
  | "body"
  | "spark"
  | "sleep"
  | "stress"
  | "connection"
  | "positive"
  | "activity_effect"
  | "absence"
  | "preference";

export type CompanionInference = {
  id: string;
  category: InferenceCategory;
  statement: string;
  sourceText: string;
  sourceDate: string;
  confidence: "low" | "medium" | "high";
  userConfirmed: boolean;
  userCorrected: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Recommendation =
  | "breathe"
  | "sit"
  | "water"
  | "notice"
  | "sundown"
  | "friend"
  | "celebrate"
  | null;

export type InferenceResult = {
  reply: string;
  options: [string, string, string];
  inferred: {
    restDelta: number;
    bodyDelta: number;
    sparkDelta: number;
  };
  spriteState: SpriteState;
  recommendation: Recommendation;
  proposedInferences: CompanionInference[];
  needsSupport: boolean;
  crisisFlag: boolean;
};

export type ActivityOutcome = {
  id: string;
  activity: "breathe" | "sit" | "water";
  helped: "yes" | "no" | "other";
  at: string;
};

export type PositiveMemory = {
  id: string;
  kind: string;
  note: string;
  at: string;
};

export type PetSignal = {
  id: string;
  text: string;
  at: string;
  active: boolean;
};

export type FriendNudge = {
  id: string;
  text: string;
  at: string;
  resolved: boolean;
  kind?: "nudge" | "hello";
};

export type VisitState = {
  direction: "incoming" | "outgoing";
  at: string;
};

export type YardLogEntry = {
  id: string;
  from: "me" | "friend";
  kind: "nudge" | "hello";
  text: string;
  at: string;
};

export type ConsentSettings = {
  memoryEnabled: boolean;
  petSignalsEnabled: boolean;
  proactiveEnabled: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
};

export type CrisisState = {
  active: boolean;
  triggeredAt: string | null;
};

export type PocketState = {
  name: string;
  spriteState: SpriteState;
};

export type Prompt = {
  id: string;
  question: string;
  options: [string, string, string];
};
