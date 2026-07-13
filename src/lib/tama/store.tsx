import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  ActivityOutcome,
  CompanionInference,
  ConsentSettings,
  ConversationMessage,
  CrisisState,
  FriendNudge,
  OverlayCorner,
  OverlayState,
  PetSignal,
  PositiveMemory,
  Prompt,
  SpriteState,
  VisitState,
  WellbeingState,
  YardLogEntry,
} from "./types";
import {
  DEFAULT_WELLBEING,
  FRIEND_NAME,
  FRIEND_PET_NAME,
  PET_NAME,
  PROMPTS,
  RETURN_PROMPT,
  USER_NAME,
} from "./constants";
import { storageService } from "./storageService";

import { detectCrisis, detectConcern } from "./crisisDetectionService";
import { getPocketReply } from "./pocketReplyService";
import type { InferenceResult } from "./types";
import { petSignalService } from "./services";
import {
  addInference,
  confirmInference as confirmInf,
  deleteAllInferences,
  deleteInference as delInf,
  editInference as editInf,
  exportMemoryJSON,
  rejectInference as rejectInf,
} from "./companionMemoryService";

// ---------- State ----------
export type Panel = "memory" | "settings" | null;
export type ScreenView = "chat" | "yard";
export type Activity = "breathe" | "sit" | "water" | null;

export type SpriteTint = "default" | "peach" | "mint" | "lilac";
export type SpriteSpecies = "blob" | "cat" | "dog" | "bunny";
export type ShellTheme = "classic" | "midnight" | "blossom" | "moss";
export type OverlayShape = "shell" | "round" | "egg";
export type OverlaySize = "s" | "m" | "l";

export type TamaState = {
  userName: string;
  petName: string;
  friendName: string;
  friendPetName: string;
  spriteTint: SpriteTint;
  spriteSpecies: SpriteSpecies;
  shellTheme: ShellTheme;
  overlayShape: OverlayShape;
  overlaySize: OverlaySize;
  onboarded: boolean;
  wellbeing: WellbeingState;
  spriteState: SpriteState;
  conversation: ConversationMessage[];
  currentPrompt: Prompt;
  showSayMore: boolean;
  lastQuick: { key: "A" | "B" | "C"; label: string } | null;
  memory: CompanionInference[];
  activity: Activity;
  crisis: CrisisState;
  overlayState: OverlayState;
  overlayCorner: OverlayCorner;
  panel: Panel;
  screenView: ScreenView;
  consent: ConsentSettings;
  lastVisit: string; // ISO
  simulatedDaysAway: number;
  friendNudge: FriendNudge | null;
  petSignal: PetSignal | null;
  visiting: VisitState | null;
  yardLog: YardLogEntry[];
  positiveMemories: PositiveMemory[];
  activityOutcomes: ActivityOutcome[];
  returnFlowActive: boolean;
  pendingRecommendation: string | null;
  pendingInferences: CompanionInference[];
  thinking: boolean;
  crisisDemoPreview: boolean;
  lastReplySource: "nebius" | "lovable" | "local" | null;
  lastNudgeTransport: "local" | "band" | "insforge" | null;
  account: { userId: string | null; email: string | null };
  pairedFriend: { id: string; userName: string; petName: string; spriteTint: string } | null;
  bond: number;
  evolutionStage: 1 | 2 | 3;
  celebratedStages: number[];
  pendingEvolutionMoment: 2 | 3 | null;
  bondTurnDay: string;
  bondTurnCount: number;
};

const INITIAL_STATE: TamaState = {
  userName: USER_NAME,
  petName: PET_NAME,
  friendName: FRIEND_NAME,
  friendPetName: FRIEND_PET_NAME,
  spriteTint: "default",
  spriteSpecies: "blob",
  shellTheme: "classic",
  overlayShape: "shell",
  overlaySize: "m",
  onboarded: false,
  wellbeing: DEFAULT_WELLBEING,
  spriteState: "idle",
  conversation: [
    {
      id: "m0",
      from: "pocket",
      text: `hi. i'm ${PET_NAME.toLowerCase()}.`,
      at: new Date().toISOString(),
    },
    {
      id: "m1",
      from: "pocket",
      text: PROMPTS[0].question,
      at: new Date().toISOString(),
    },
  ],
  currentPrompt: PROMPTS[0],
  showSayMore: false,
  lastQuick: null,
  memory: [],
  activity: null,
  crisis: { active: false, triggeredAt: null },
  overlayState: "expanded",
  overlayCorner: "br",
  panel: null,
  screenView: "chat",
  consent: {
    memoryEnabled: true,
    petSignalsEnabled: true,
    proactiveEnabled: true,
    soundEnabled: false,
    reducedMotion: false,
  },
  lastVisit: new Date().toISOString(),
  simulatedDaysAway: 0,
  friendNudge: null,
  petSignal: null,
  visiting: null,
  yardLog: [],
  positiveMemories: [],
  activityOutcomes: [],
  returnFlowActive: false,
  pendingRecommendation: null,
  pendingInferences: [],
  thinking: false,
  crisisDemoPreview: false,
  lastReplySource: null,
  lastNudgeTransport: null,
  account: { userId: null, email: null },
  pairedFriend: null,
  bond: 0,
  evolutionStage: 1,
  celebratedStages: [],
  pendingEvolutionMoment: null,
  bondTurnDay: "",
  bondTurnCount: 0,
};

// ---------- Actions ----------
type Action =
  | { type: "hydrate"; state: TamaState }
  | { type: "quickAnswer"; key: "A" | "B" | "C"; label: string }
  | { type: "sayMore"; text: string }
  | { type: "skipSayMore" }
  | { type: "advancePrompt" }
  | { type: "activityFeedback"; feedback: "yes" | "no" | "other" }
  | { type: "openActivity"; activity: Activity }
  | { type: "closeActivity" }
  | { type: "setPanel"; panel: Panel }
  | { type: "setScreenView"; view: ScreenView }
  | { type: "setOverlay"; overlay: OverlayState }
  | { type: "setCorner"; corner: OverlayCorner }
  | { type: "editMemory"; id: string; statement: string }
  | { type: "deleteMemory"; id: string }
  | { type: "rejectMemory"; id: string }
  | { type: "confirmMemory"; id: string }
  | { type: "wipeMemory" }
  | { type: "toggleConsent"; key: keyof ConsentSettings }
  | { type: "triggerCrisis" }
  | { type: "clearCrisis" }
  | { type: "openCrisisDemo" }
  | { type: "skipDays"; days: number }
  | { type: "seedWeek" }
  | { type: "sendPetSignal"; kind: "nudge" | "hello" }
  | { type: "goVisit" }
  | { type: "endVisit" }
  | { type: "markRealCheckin" }
  | { type: "declineNudge" }
  | { type: "addPositiveMemory"; kind: string; note: string }
  | { type: "setMeters"; wellbeing: Partial<WellbeingState> }
  | { type: "setSprite"; sprite: SpriteState }
  | { type: "resetAll" }
  | { type: "acceptPendingInferences" }
  | { type: "resetDemo" }
  | {
      type: "_beginTurn";
      userText: string;
      quick: { key: "A" | "B" | "C"; label: string } | null;
      isFreeText: boolean;
    }
  | { type: "_applyReply"; result: InferenceResult; isFreeText: boolean; source: "nebius" | "lovable" | "local" }
  | { type: "_beginConcern"; userText: string }
  | {
      type: "completeOnboarding";
      userName: string;
      petName: string;
      spriteTint: SpriteTint;
      spriteSpecies?: SpriteSpecies;
      shellTheme?: ShellTheme;
      overlayShape?: OverlayShape;
      overlaySize?: OverlaySize;
    }
  | { type: "setAppearance"; patch: Partial<Pick<TamaState, "spriteTint" | "spriteSpecies" | "shellTheme" | "overlayShape" | "overlaySize">> }
  | { type: "setAccount"; userId: string | null; email: string | null }
  | { type: "setPairedFriend"; friend: TamaState["pairedFriend"] }
  | { type: "applyServerHydrate"; patch: Partial<TamaState> }
  | {
      type: "receiveExternalNudge";
      text: string;
      kind?: "nudge" | "hello" | "visit" | "leave";
      via?: "local" | "band" | "insforge";
    }
  | { type: "setNudgeTransport"; via: "local" | "band" | "insforge" | null }
  | { type: "bondBump"; amount: number }
  | { type: "setEvolutionStage"; stage: 1 | 2 | 3 }
  | { type: "replayEvolutionMoment"; stage: 2 | 3 };

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function applyDelta(w: WellbeingState, d: { restDelta: number; bodyDelta: number; sparkDelta: number }): WellbeingState {
  return {
    rest: clamp(w.rest + d.restDelta),
    body: clamp(w.body + d.bodyDelta),
    spark: clamp(w.spark + d.sparkDelta),
  };
}

function pushMsg(list: ConversationMessage[], from: "pocket" | "user", text: string): ConversationMessage[] {
  return [
    ...list,
    { id: `m_${Math.random().toString(36).slice(2, 8)}`, from, text, at: new Date().toISOString() },
  ].slice(-40);
}

function pushYardLog(
  list: YardLogEntry[],
  from: "me" | "friend",
  kind: "nudge" | "hello",
  text: string,
): YardLogEntry[] {
  return [
    ...list,
    { id: `yl_${Math.random().toString(36).slice(2, 8)}`, from, kind, text, at: new Date().toISOString() },
  ].slice(-20);
}

function pickPromptAvoiding(currentId: string): Prompt {
  const others = PROMPTS.filter((p) => p.id !== currentId);
  return others[Math.floor(Math.random() * others.length)];
}

const STAGE_LINES: Record<2 | 3, string> = {
  2: "i think i grew a little. it's because of us.",
  3: "look. something bloomed. i'm keeping it.",
};

function stageFromBond(bond: number): 1 | 2 | 3 {
  if (bond >= 70) return 3;
  if (bond >= 25) return 2;
  return 1;
}

// Bond only ever grows. Never subtract.
function applyBondGain(state: TamaState, gain: number): TamaState {
  const amount = Math.max(0, gain);
  const bond = state.bond + amount;
  const target = Math.max(state.evolutionStage, stageFromBond(bond)) as 1 | 2 | 3;
  if (target === state.evolutionStage || state.celebratedStages.includes(target)) {
    return { ...state, bond, evolutionStage: target };
  }
  // Crossing a threshold — defer if crisis is active.
  if (state.crisis.active) {
    return {
      ...state,
      bond,
      evolutionStage: target,
      pendingEvolutionMoment: target as 2 | 3,
    };
  }
  return {
    ...state,
    bond,
    evolutionStage: target,
    spriteState: state.consent.reducedMotion ? state.spriteState : "celebrating",
    conversation: pushMsg(state.conversation, "pocket", STAGE_LINES[target as 2 | 3]),
    celebratedStages: [...state.celebratedStages, target],
    pendingEvolutionMoment: null,
  };
}

function applyTurnBond(state: TamaState): TamaState {
  const today = new Date().toISOString().slice(0, 10);
  const count = state.bondTurnDay === today ? state.bondTurnCount : 0;
  if (count >= 3) return { ...state, bondTurnDay: today, bondTurnCount: count };
  const next = applyBondGain(state, 1);
  return { ...next, bondTurnDay: today, bondTurnCount: count + 1 };
}

function reducer(state: TamaState, action: Action): TamaState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "_beginTurn": {
      // Sync pre-crisis check on raw user text
      if (detectCrisis(action.userText)) {
        return {
          ...state,
          conversation: pushMsg(state.conversation, "user", action.userText),
          crisis: { active: true, triggeredAt: new Date().toISOString() },
          spriteState: "low",
          showSayMore: false,
          thinking: false,
        };
      }
      return {
        ...state,
        conversation: pushMsg(state.conversation, "user", action.userText),
        lastQuick: action.quick ?? state.lastQuick,
        showSayMore: false,
        thinking: true,
      };
    }

    case "_applyReply": {
      const result = action.result;
      if (result.crisisFlag) {
        return {
          ...state,
          crisis: { active: true, triggeredAt: new Date().toISOString() },
          spriteState: "low",
          thinking: false,
          showSayMore: false,
          lastReplySource: action.source,
        };
      }
      const convo = pushMsg(state.conversation, "pocket", result.reply);
      // memory off: nothing sent, nothing proposed, nothing shown.
      const memoryOn = state.consent.memoryEnabled;
      const proposed = memoryOn ? result.proposedInferences : [];
      const nextMemory = memoryOn
        ? [...result.proposedInferences, ...state.memory]
        : state.memory;
      // AI's follow-up options become the visible chips. On the local
      // fallback we keep the prior prompt so quick-reply chips stay stable.
      const nextPrompt =
        action.source === "local"
          ? state.currentPrompt
          : {
              id: `ai_${Math.random().toString(36).slice(2, 8)}`,
              question: result.reply,
              options: result.options,
            };
      const next: TamaState = {
        ...state,
        conversation: convo,
        wellbeing: applyDelta(state.wellbeing, result.inferred),
        spriteState: result.spriteState,
        pendingRecommendation: result.recommendation ?? state.pendingRecommendation,
        memory: nextMemory,
        pendingInferences: proposed,
        currentPrompt: nextPrompt,
        showSayMore: action.isFreeText ? false : true,
        thinking: false,
        returnFlowActive: false,
        lastReplySource: action.source,
      };
      return applyTurnBond(next);
    }

    case "_beginConcern": {
      const withUser = pushMsg(state.conversation, "user", action.userText);
      const CONCERN_LINE =
        "did you get hurt, or is this something heavier? i'm here either way.";
      const withPocket = pushMsg(withUser, "pocket", CONCERN_LINE);
      return {
        ...state,
        conversation: withPocket,
        currentPrompt: {
          id: "concern",
          question: CONCERN_LINE,
          options: ["just an accident", "i'm struggling", "come back to this"],
        },
        showSayMore: false,
        thinking: false,
        lastQuick: null,
      };
    }



    case "skipSayMore":
      return { ...state, showSayMore: false };

    case "advancePrompt": {
      const next = pickPromptAvoiding(state.currentPrompt.id);
      const nextConvo = pushMsg(state.conversation, "pocket", next.question);
      return { ...state, currentPrompt: next, conversation: nextConvo, showSayMore: false, lastQuick: null };
    }

    case "openActivity":
      return { ...state, activity: action.activity, overlayState: "activity" };

    case "closeActivity":
      return { ...state, activity: null, overlayState: "expanded" };

    case "activityFeedback": {
      const activity = state.activity;
      if (!activity) return state;
      const outcome: ActivityOutcome = {
        id: `out_${Math.random().toString(36).slice(2, 8)}`,
        activity,
        helped: action.feedback,
        at: new Date().toISOString(),
      };
      const bonus =
        action.feedback === "yes"
          ? activity === "breathe"
            ? { rest: 4, spark: 2, body: 0 }
            : activity === "sit"
              ? { rest: 5, spark: 1, body: 0 }
              : { body: 6, rest: 0, spark: 1 }
          : { rest: 0, body: 0, spark: 0 };
      const inf: CompanionInference | null =
        action.feedback === "yes"
          ? {
              id: `inf_${Math.random().toString(36).slice(2, 8)}`,
              category: "activity_effect",
              statement:
                activity === "breathe"
                  ? "the breathing ritual seemed to help."
                  : activity === "sit"
                    ? "sitting together seemed to help."
                    : "drinking water seemed to help.",
              sourceText: `activity: ${activity}`,
              sourceDate: new Date().toISOString(),
              confidence: "medium",
              userConfirmed: false,
              userCorrected: false,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null;
      const afterActivity: TamaState = {
        ...state,
        activityOutcomes: [outcome, ...state.activityOutcomes],
        wellbeing: {
          rest: clamp(state.wellbeing.rest + (bonus.rest ?? 0)),
          body: clamp(state.wellbeing.body + (bonus.body ?? 0)),
          spark: clamp(state.wellbeing.spark + (bonus.spark ?? 0)),
        },
        memory: inf && state.consent.memoryEnabled ? addInference(state.memory, inf) : state.memory,
        activity: null,
        overlayState: "expanded",
        spriteState: action.feedback === "yes" ? "perked" : state.spriteState,
      };
      return action.feedback === "yes" ? applyBondGain(afterActivity, 2) : afterActivity;
    }

    case "setPanel":
      return { ...state, panel: action.panel };

    case "setScreenView":
      return { ...state, screenView: action.view };

    case "setOverlay":
      return { ...state, overlayState: action.overlay };

    case "setCorner":
      return { ...state, overlayCorner: action.corner };

    case "editMemory":
      return { ...state, memory: editInf(state.memory, action.id, action.statement) };

    case "deleteMemory":
      return { ...state, memory: delInf(state.memory, action.id) };

    case "rejectMemory":
      return { ...state, memory: rejectInf(state.memory, action.id) };

    case "confirmMemory":
      return applyBondGain(
        { ...state, memory: confirmInf(state.memory, action.id) },
        3,
      );


    case "wipeMemory":
      return { ...state, memory: deleteAllInferences() };

    case "toggleConsent":
      return {
        ...state,
        consent: { ...state.consent, [action.key]: !state.consent[action.key] },
      };

    case "triggerCrisis":
      return { ...state, crisis: { active: true, triggeredAt: new Date().toISOString() } };

    case "openCrisisDemo":
      return {
        ...state,
        crisis: { active: true, triggeredAt: new Date().toISOString() },
        crisisDemoPreview: true,
      };

    case "clearCrisis": {
      const cleared: TamaState = {
        ...state,
        crisis: { active: false, triggeredAt: null },
        crisisDemoPreview: false,
      };
      // Deferred evolution moment — play it now.
      const pending = cleared.pendingEvolutionMoment;
      if (pending && !cleared.celebratedStages.includes(pending)) {
        return {
          ...cleared,
          spriteState: cleared.consent.reducedMotion ? cleared.spriteState : "celebrating",
          conversation: pushMsg(cleared.conversation, "pocket", STAGE_LINES[pending]),
          celebratedStages: [...cleared.celebratedStages, pending],
          pendingEvolutionMoment: null,
        };
      }
      return cleared;
    }


    case "skipDays": {
      const days = action.days;
      // Ethical rule: absence changes presentation only — no meter drift,
      // no memory entry, no distressed sprite. Pocket just went sleepy.
      const convo = pushMsg(state.conversation, "pocket", RETURN_PROMPT.question);
      return {
        ...state,
        spriteState: "sleepy",
        simulatedDaysAway: state.simulatedDaysAway + days,
        currentPrompt: RETURN_PROMPT,
        conversation: convo,
        returnFlowActive: true,
        showSayMore: false,
        lastQuick: null,
      };
    }

    case "seedWeek": {
      const now = Date.now();
      const seed: CompanionInference[] = [
        {
          id: "seed1",
          category: "sleep",
          statement: "you mentioned sleeping poorly twice this week.",
          sourceText: "i barely slept last night",
          sourceDate: new Date(now - 2 * 864e5).toISOString(),
          confidence: "medium",
          userConfirmed: false,
          userCorrected: false,
          isActive: true,
          createdAt: new Date(now - 2 * 864e5).toISOString(),
          updatedAt: new Date(now - 2 * 864e5).toISOString(),
        },
        {
          id: "seed2",
          category: "stress",
          statement: "work has felt overwhelming in your recent check-ins.",
          sourceText: "work is a lot",
          sourceDate: new Date(now - 3 * 864e5).toISOString(),
          confidence: "medium",
          userConfirmed: false,
          userCorrected: false,
          isActive: true,
          createdAt: new Date(now - 3 * 864e5).toISOString(),
          updatedAt: new Date(now - 3 * 864e5).toISOString(),
        },
        {
          id: "seed3",
          category: "activity_effect",
          statement: "the breathing ritual seemed to help yesterday.",
          sourceText: "activity: breathe (helped)",
          sourceDate: new Date(now - 1 * 864e5).toISOString(),
          confidence: "high",
          userConfirmed: true,
          userCorrected: false,
          isActive: true,
          createdAt: new Date(now - 1 * 864e5).toISOString(),
          updatedAt: new Date(now - 1 * 864e5).toISOString(),
        },
        {
          id: "seed4",
          category: "connection",
          statement: `you sounded lighter after talking with ${state.friendName.toLowerCase()}.`,
          sourceText: `saw ${state.friendName.toLowerCase()}`,
          sourceDate: new Date(now - 4 * 864e5).toISOString(),
          confidence: "medium",
          userConfirmed: false,
          userCorrected: false,
          isActive: true,
          createdAt: new Date(now - 4 * 864e5).toISOString(),
          updatedAt: new Date(now - 4 * 864e5).toISOString(),
        },
      ];
      return {
        ...state,
        memory: [...seed, ...state.memory],
        wellbeing: { rest: 48, body: 55, spark: 40 },
        spriteState: "sleepy",
      };
    }

    case "sendPetSignal": {
      if (!state.consent.petSignalsEnabled) return state;
      const sig = petSignalService.buildSignal(action.kind, state.petName);
      // The bubble shows the actual text that crosses the wire (what the
      // friend will see), not the self-facing preview text in `petSignal`.
      const wireText = petSignalService.translateForFriend(action.kind, state.userName);
      return {
        ...state,
        petSignal: sig,
        yardLog: pushYardLog(state.yardLog, "me", action.kind, wireText),
      };
    }

    case "goVisit": {
      if (!state.consent.petSignalsEnabled) return state;
      return {
        ...state,
        visiting: { direction: "outgoing", at: new Date().toISOString() },
        screenView: "yard",
      };
    }

    case "endVisit":
      return { ...state, visiting: null };

    case "markRealCheckin": {
      const inf: CompanionInference = {
        id: `inf_${Math.random().toString(36).slice(2, 8)}`,
        category: "connection",
        statement: `you connected with ${state.friendName.toLowerCase()} in the real world.`,
        sourceText: "marked real-life check-in complete",
        sourceDate: new Date().toISOString(),
        confidence: "high",
        userConfirmed: true,
        userCorrected: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        friendNudge: state.friendNudge ? { ...state.friendNudge, resolved: true } : null,
        wellbeing: { ...state.wellbeing, spark: clamp(state.wellbeing.spark + 12) },
        spriteState: "celebrating",
        memory: state.consent.memoryEnabled ? addInference(state.memory, inf) : state.memory,
        conversation: pushMsg(state.conversation, "pocket", "someone showed up outside the screen."),
      };
    }

    case "declineNudge":
      return {
        ...state,
        friendNudge: state.friendNudge ? { ...state.friendNudge, resolved: true } : null,
      };

    case "addPositiveMemory": {
      const pm: PositiveMemory = {
        id: `pos_${Math.random().toString(36).slice(2, 8)}`,
        kind: action.kind,
        note: action.note,
        at: new Date().toISOString(),
      };
      const inf: CompanionInference = {
        id: `inf_${Math.random().toString(36).slice(2, 8)}`,
        category: "positive",
        statement: action.note || `you noted a good moment: ${action.kind}.`,
        sourceText: action.note || action.kind,
        sourceDate: new Date().toISOString(),
        confidence: "high",
        userConfirmed: true,
        userCorrected: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return applyBondGain(
        {
          ...state,
          positiveMemories: [pm, ...state.positiveMemories],
          memory: state.consent.memoryEnabled ? addInference(state.memory, inf) : state.memory,
          spriteState: "celebrating",
        },
        2,
      );
    }

    case "setMeters":
      return { ...state, wellbeing: { ...state.wellbeing, ...action.wellbeing } };

    case "setSprite":
      return { ...state, spriteState: action.sprite };

    case "resetAll":
    case "resetDemo":
      return { ...INITIAL_STATE, lastVisit: new Date().toISOString() };

    case "acceptPendingInferences":
      return { ...state, pendingInferences: [] };

    case "completeOnboarding": {
      const cleanUser = action.userName.trim() || USER_NAME;
      const cleanPet = action.petName.trim() || PET_NAME;
      return {
        ...state,
        userName: cleanUser,
        petName: cleanPet,
        spriteTint: action.spriteTint,
        spriteSpecies: action.spriteSpecies ?? state.spriteSpecies,
        shellTheme: action.shellTheme ?? state.shellTheme,
        overlayShape: action.overlayShape ?? state.overlayShape,
        overlaySize: action.overlaySize ?? state.overlaySize,
        onboarded: true,
        conversation: [
          {
            id: "m0",
            from: "pocket",
            text: `hi ${cleanUser.toLowerCase()}. i'm ${cleanPet.toLowerCase()}.`,
            at: new Date().toISOString(),
          },
          {
            id: "m1",
            from: "pocket",
            text: PROMPTS[0].question,
            at: new Date().toISOString(),
          },
        ],
      };
    }

    case "setAppearance":
      return { ...state, ...action.patch };


    case "setAccount":
      return { ...state, account: { userId: action.userId, email: action.email } };

    case "setPairedFriend":
      return {
        ...state,
        pairedFriend: action.friend,
        friendName: action.friend?.userName ?? state.friendName,
        friendPetName: action.friend?.petName ?? state.friendPetName,
      };

    case "applyServerHydrate":
      return { ...state, ...action.patch };

    case "receiveExternalNudge": {
      if (!state.consent.petSignalsEnabled) return state;
      const kind = action.kind ?? "nudge";
      const lastNudgeTransport = action.via ?? state.lastNudgeTransport;
      if (kind === "visit") {
        return {
          ...state,
          visiting: { direction: "incoming", at: new Date().toISOString() },
          screenView: "yard",
          lastNudgeTransport,
        };
      }
      if (kind === "leave") {
        // Friend's pet headed home — clear it only if they were the one
        // visiting us (don't touch an unrelated outgoing visit of ours).
        return {
          ...state,
          visiting: state.visiting?.direction === "incoming" ? null : state.visiting,
          lastNudgeTransport,
        };
      }
      const nudge: FriendNudge = {
        id: `nudge_${Math.random().toString(36).slice(2, 8)}`,
        text: action.text,
        at: new Date().toISOString(),
        resolved: false,
        kind,
      };
      return {
        ...state,
        friendNudge: nudge,
        screenView: "yard",
        yardLog: pushYardLog(state.yardLog, "friend", kind, action.text),
        lastNudgeTransport,
      };
    }

    case "setNudgeTransport":
      return { ...state, lastNudgeTransport: action.via };

    case "bondBump":
      return applyBondGain(state, action.amount);

    case "setEvolutionStage": {
      // Bond only ever goes up. Clamp bond to at least the stage floor.
      const floor = action.stage === 3 ? 70 : action.stage === 2 ? 25 : 0;
      const bond = Math.max(state.bond, floor);
      const nextStage = Math.max(state.evolutionStage, action.stage) as 1 | 2 | 3;
      return { ...state, bond, evolutionStage: nextStage };
    }

    case "replayEvolutionMoment":
      return {
        ...state,
        spriteState: state.consent.reducedMotion ? state.spriteState : "celebrating",
        conversation: pushMsg(state.conversation, "pocket", STAGE_LINES[action.stage]),
      };


    default:
      return state;
  }
}

// ---------- Context ----------
type Ctx = {
  state: TamaState;
  dispatch: React.Dispatch<Action>;
  exportMemory: () => string;
};
const TamaContext = createContext<Ctx | null>(null);

export function TamaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const hydrated = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Async wrapper: intercepts quickAnswer / sayMore to route through the LLM.
  const wrappedDispatch = useCallback<React.Dispatch<Action>>((action) => {
    if (action.type === "wipeMemory") {
      dispatch(action);
      void (async () => {
        const { makeHydraProvider } = await import("./hydraMemoryProvider");
        await makeHydraProvider(stateRef.current.account.userId).forgetAll();
      })();
      return;
    }
    if (action.type === "quickAnswer") {
      const label = action.label;
      // Concern branch: deterministic handling, no AI, no meter changes.
      if (stateRef.current.currentPrompt.id === "concern") {
        if (label === "i'm struggling") {
          dispatch({ type: "triggerCrisis" });
        } else {
          dispatch({ type: "advancePrompt" });
        }
        return;
      }
      if (detectConcern(label)) {
        dispatch({ type: "_beginConcern", userText: label });
        return;
      }
      dispatch({
        type: "_beginTurn",
        userText: label,
        quick: { key: action.key, label },
        isFreeText: false,
      });
      const snap = stateRef.current;
      if (detectCrisis(label)) return;
      void (async () => {
        let activeMemories: CompanionInference[] = [];
        if (snap.consent.memoryEnabled) {
          try {
            const { makeHydraProvider, isHydraConfigured } = await import(
              "./hydraMemoryProvider"
            );
            if (await isHydraConfigured()) {
              activeMemories = await makeHydraProvider(
                snap.account.userId,
              ).retrieveRelevant(label);
            }
          } catch {
            /* fall through to local */
          }
          if (!activeMemories.length) {
            activeMemories = snap.memory.filter((m) => m.isActive);
          }
        }
        const { result, source } = await getPocketReply(
          { quick: action.key, quickLabel: label },
          {
            wellbeing: snap.wellbeing,
            recentMessages: snap.conversation,
            activeMemories,
          },
        );
        dispatch({ type: "_applyReply", result, isFreeText: false, source });
      })();
      return;
    }
    if (action.type === "sayMore") {
      const text = action.text.trim();
      if (!text) return;
      if (detectConcern(text)) {
        dispatch({ type: "_beginConcern", userText: text });
        return;
      }
      dispatch({
        type: "_beginTurn",
        userText: text,
        quick: null,
        isFreeText: true,
      });
      if (detectCrisis(text)) return;
      const snap = stateRef.current;
      void (async () => {
        let activeMemories: CompanionInference[] = [];
        if (snap.consent.memoryEnabled) {
          try {
            const { makeHydraProvider, isHydraConfigured } = await import(
              "./hydraMemoryProvider"
            );
            if (await isHydraConfigured()) {
              activeMemories = await makeHydraProvider(
                snap.account.userId,
              ).retrieveRelevant(text);
            }
          } catch {
            /* fall through */
          }
          if (!activeMemories.length) {
            activeMemories = snap.memory.filter((m) => m.isActive);
          }
        }
        // The prior quick answer is already in recentMessages; don't
        // double-count its meter signal on the free-text turn.
        const { result, source } = await getPocketReply(
          { quick: null, quickLabel: null, freeText: text },
          {
            wellbeing: snap.wellbeing,
            recentMessages: snap.conversation,
            activeMemories,
          },
        );
        dispatch({ type: "_applyReply", result, isFreeText: true, source });
      })();
      return;
    }
    dispatch(action);
  }, []);



  // Hydrate from localStorage once
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const loaded = storageService.load<TamaState>();
    if (loaded) {
      // Existing saves predate onboarded/spriteTint — treat them as already-onboarded.
      const backfilled: TamaState = {
        ...loaded,
        thinking: false,
        onboarded: loaded.onboarded ?? true,
        spriteTint: loaded.spriteTint ?? "default",
        spriteSpecies: loaded.spriteSpecies ?? "blob",
        shellTheme: loaded.shellTheme ?? "classic",
        overlayShape: loaded.overlayShape ?? "shell",
        overlaySize: loaded.overlaySize ?? "m",
        bond: loaded.bond ?? 0,
        evolutionStage: loaded.evolutionStage ?? 1,
        celebratedStages: loaded.celebratedStages ?? [],
        pendingEvolutionMoment: loaded.pendingEvolutionMoment ?? null,
        bondTurnDay: loaded.bondTurnDay ?? "",
        bondTurnCount: loaded.bondTurnCount ?? 0,
        visiting: loaded.visiting ?? null,
        screenView: "chat",
        yardLog: loaded.yardLog ?? [],
        // Old saves may carry the retired "yard" panel value.
        panel: (loaded.panel as string) === "yard" ? null : loaded.panel,
      };
      try {
        const last = new Date(loaded.lastVisit).getTime();
        const hoursAway = (Date.now() - last) / 36e5;
        if (hoursAway > 20) {
          dispatch({ type: "hydrate", state: backfilled });
          setTimeout(
            () => dispatch({ type: "skipDays", days: Math.max(1, Math.floor(hoursAway / 24)) }),
            300,
          );
          return;
        }
      } catch {
        /* ignore */
      }
      dispatch({ type: "hydrate", state: backfilled });
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    storageService.save({ ...state, lastVisit: new Date().toISOString(), thinking: false });
  }, [state]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        dispatch({
          type: "setPanel",
          panel: stateRef.current.panel === "settings" ? null : "settings",
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- InsForge integration (all no-ops when unconfigured) ----------
  // Detect current session; hydrate from server on sign-in.
  const authInited = useRef(false);
  useEffect(() => {
    if (authInited.current) return;
    authInited.current = true;
    let cancelled = false;
    void (async () => {
      const { getCurrentUser } = await import("./insforgeAuth");
      const u = await getCurrentUser();
      if (cancelled || !u) return;
      dispatch({ type: "setAccount", userId: u.id, email: u.email });
      const { hydrateFromServer } = await import("./insforgeHydrate");
      const h = await hydrateFromServer(u.id);
      if (cancelled) return;
      const patch: Partial<TamaState> = {};
      if (h.profile) {
        patch.userName = h.profile.userName;
        patch.petName = h.profile.petName;
        patch.spriteTint = (h.profile.spriteTint as SpriteTint) ?? "default";
        if (h.profile.spriteSpecies) patch.spriteSpecies = h.profile.spriteSpecies as SpriteSpecies;
        if (h.profile.shellTheme) patch.shellTheme = h.profile.shellTheme as ShellTheme;
        if (h.profile.overlayShape) patch.overlayShape = h.profile.overlayShape as OverlayShape;
        if (h.profile.overlaySize) patch.overlaySize = h.profile.overlaySize as OverlaySize;
        // Bond only ever grows — take the max of local and server.
        if (typeof h.profile.bond === "number") patch.bond = Math.max(state.bond, h.profile.bond);
        if (h.profile.evolutionStage) patch.evolutionStage = Math.max(state.evolutionStage, h.profile.evolutionStage) as 1 | 2 | 3;
        patch.onboarded = true;
      }
      if (h.wellbeing) patch.wellbeing = h.wellbeing;
      if (h.consent) patch.consent = h.consent;
      if (h.memory) patch.memory = h.memory;
      if (h.positive) patch.positiveMemories = h.positive;
      if (Object.keys(patch).length) dispatch({ type: "applyServerHydrate", patch });

      const { getPairedFriend } = await import("./insforgeFriends");
      const friend = await getPairedFriend();
      if (!cancelled && friend) dispatch({ type: "setPairedFriend", friend });

      const { subscribeNudges } = await import("./nudgeTransport");
      const unsub = await subscribeNudges(u.id, friend?.id ?? null, (n, via) => {
        dispatch({ type: "receiveExternalNudge", text: n.text, kind: n.kind, via });
      });
      (window as unknown as { __tamaUnsub?: () => void }).__tamaUnsub = unsub;
    })();
    return () => {
      cancelled = true;
      const w = window as unknown as { __tamaUnsub?: () => void };
      w.__tamaUnsub?.();
      w.__tamaUnsub = undefined;
    };
  }, []);

  // ---------- Local two-window testing (?as=a / ?as=b), no-op otherwise ----------
  // BroadcastChannel between two tabs in the same browser profile — lets you
  // actually pair and exchange nudges/hellos/visits without any backend.
  const localInited = useRef(false);
  useEffect(() => {
    if (localInited.current) return;
    localInited.current = true;
    let cancelled = false;
    void (async () => {
      const { getLocalSlot, otherSlot, subscribeLocalChannel, announcePresence } =
        await import("./localTransport");
      const slot = getLocalSlot();
      if (!slot || cancelled) return;
      const unsub = subscribeLocalChannel(slot, {
        onPresence: (p) => {
          dispatch({
            type: "setPairedFriend",
            friend: {
              id: otherSlot(slot),
              userName: p.userName,
              petName: p.petName,
              spriteTint: "default",
            },
          });
          // Reply once so a window that loaded (and announced) before this
          // one also learns who we are — BroadcastChannel doesn't replay.
          if (!p.ack) {
            announcePresence(slot, stateRef.current.userName, stateRef.current.petName, true);
          }
        },
        onSignal: (s) => {
          dispatch({ type: "receiveExternalNudge", text: s.text, kind: s.kind, via: "local" });
        },
      });
      announcePresence(slot, stateRef.current.userName, stateRef.current.petName);
      (window as unknown as { __tamaLocalUnsub?: () => void }).__tamaLocalUnsub = unsub;
    })();
    return () => {
      cancelled = true;
      const w = window as unknown as { __tamaLocalUnsub?: () => void };
      w.__tamaLocalUnsub?.();
      w.__tamaLocalUnsub = undefined;
    };
  }, []);

  // Re-announce presence whenever name/pet change so the other local window's
  // labels stay current (e.g. right after onboarding completes).
  useEffect(() => {
    if (!hydrated.current) return;
    void (async () => {
      const { getLocalSlot, announcePresence } = await import("./localTransport");
      const slot = getLocalSlot();
      if (slot) announcePresence(slot, state.userName, state.petName);
    })();
  }, [state.userName, state.petName]);

  // Debounced sync: fire per-slice when relevant state changes.
  const syncedOnce = useRef(false);
  useEffect(() => {
    if (!state.account.userId) return;
    void (async () => {
      const s = await import("./insforgeSync");
      // Skip the first tick after hydrate to avoid overwriting server with defaults.
      if (!syncedOnce.current) {
        syncedOnce.current = true;
        return;
      }
      s.syncProfile(state);
      s.syncWellbeing(state);
      s.syncConsent(state);
      s.syncMemory(state);
      s.syncPositive(state);
    })();
  }, [
    state.account.userId,
    state.userName,
    state.petName,
    state.spriteTint,
    state.spriteSpecies,
    state.shellTheme,
    state.overlayShape,
    state.overlaySize,
    state.wellbeing,
    state.spriteState,
    state.consent,
    state.memory,
    state.positiveMemories,
  ]);

  // Hydra memory provider: debounced save of confirmed memories, and
  // remote wipe whenever memory consent is turned off.
  const prevMemoryConsent = useRef(state.consent.memoryEnabled);
  useEffect(() => {
    if (!hydrated.current) return;
    const wasOn = prevMemoryConsent.current;
    prevMemoryConsent.current = state.consent.memoryEnabled;

    // consent flipped off → wipe remote
    if (wasOn && !state.consent.memoryEnabled) {
      void (async () => {
        const { makeHydraProvider } = await import("./hydraMemoryProvider");
        await makeHydraProvider(state.account.userId).forgetAll();
      })();
      return;
    }

    if (!state.consent.memoryEnabled) return;
    const t = setTimeout(() => {
      void (async () => {
        const { makeHydraProvider } = await import("./hydraMemoryProvider");
        await makeHydraProvider(state.account.userId).save(state.memory);
      })();
    }, 600);
    return () => clearTimeout(t);
  }, [state.memory, state.consent.memoryEnabled, state.account.userId]);

  const exportMemory = useCallback(() => exportMemoryJSON(state.memory), [state.memory]);


  const value = useMemo(
    () => ({ state, dispatch: wrappedDispatch, exportMemory }),
    [state, exportMemory, wrappedDispatch],
  );
  return <TamaContext.Provider value={value}>{children}</TamaContext.Provider>;
}

export function useTama() {
  const ctx = useContext(TamaContext);
  if (!ctx) throw new Error("useTama must be used within TamaProvider");
  return ctx;
}
