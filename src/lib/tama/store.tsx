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
  WellbeingState,
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
import { infer, type InferInput } from "./wellbeingInferenceService";
import { detectCrisis } from "./crisisDetectionService";
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
export type Panel = "memory" | "settings" | "yard" | null;
export type Activity = "breathe" | "sit" | "water" | null;

export type TamaState = {
  userName: string;
  petName: string;
  friendName: string;
  friendPetName: string;
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
  consent: ConsentSettings;
  lastVisit: string; // ISO
  simulatedDaysAway: number;
  friendNudge: FriendNudge | null;
  petSignal: PetSignal | null;
  positiveMemories: PositiveMemory[];
  activityOutcomes: ActivityOutcome[];
  returnFlowActive: boolean;
  pendingRecommendation: string | null;
  pendingInferences: CompanionInference[];
};

const INITIAL_STATE: TamaState = {
  userName: USER_NAME,
  petName: PET_NAME,
  friendName: FRIEND_NAME,
  friendPetName: FRIEND_PET_NAME,
  wellbeing: DEFAULT_WELLBEING,
  spriteState: "idle",
  conversation: [
    {
      id: "m0",
      from: "pocket",
      text: `hi. i'm ${PET_NAME.toLowerCase()}. small check-in?`,
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
  positiveMemories: [],
  activityOutcomes: [],
  returnFlowActive: false,
  pendingRecommendation: null,
  pendingInferences: [],
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
  | { type: "skipDays"; days: number }
  | { type: "seedWeek" }
  | { type: "sendPetSignal" }
  | { type: "receiveFriendNudge" }
  | { type: "markRealCheckin" }
  | { type: "declineNudge" }
  | { type: "addPositiveMemory"; kind: string; note: string }
  | { type: "setMeters"; wellbeing: Partial<WellbeingState> }
  | { type: "setSprite"; sprite: SpriteState }
  | { type: "resetAll" }
  | { type: "acceptPendingInferences" }
  | { type: "resetDemo" };

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

function pickPromptAvoiding(currentId: string): Prompt {
  const others = PROMPTS.filter((p) => p.id !== currentId);
  return others[Math.floor(Math.random() * others.length)];
}

function reducer(state: TamaState, action: Action): TamaState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "quickAnswer": {
      const input: InferInput = { quick: action.key, quickLabel: action.label };
      const result = infer(input);
      if (result.crisisFlag) {
        return {
          ...state,
          conversation: pushMsg(state.conversation, "user", action.label),
          crisis: { active: true, triggeredAt: new Date().toISOString() },
          spriteState: "low",
        };
      }
      let convo = pushMsg(state.conversation, "user", action.label);
      convo = pushMsg(convo, "pocket", result.reply);
      const nextMemory = state.consent.memoryEnabled
        ? [...result.proposedInferences, ...state.memory]
        : state.memory;
      return {
        ...state,
        lastQuick: { key: action.key, label: action.label },
        showSayMore: true,
        conversation: convo,
        wellbeing: applyDelta(state.wellbeing, result.inferred),
        spriteState: result.spriteState,
        pendingRecommendation: result.recommendation,
        memory: nextMemory,
        pendingInferences: result.proposedInferences,
        returnFlowActive: false,
      };
    }

    case "sayMore": {
      if (!action.text.trim()) return state;
      const crisisFlag = detectCrisis(action.text);
      if (crisisFlag) {
        return {
          ...state,
          conversation: pushMsg(state.conversation, "user", action.text),
          crisis: { active: true, triggeredAt: new Date().toISOString() },
          spriteState: "low",
          showSayMore: false,
        };
      }
      const result = infer({
        quick: state.lastQuick?.key ?? null,
        quickLabel: state.lastQuick?.label ?? null,
        freeText: action.text,
      });
      let convo = pushMsg(state.conversation, "user", action.text);
      convo = pushMsg(convo, "pocket", result.reply);
      const nextMemory = state.consent.memoryEnabled
        ? [...result.proposedInferences, ...state.memory]
        : state.memory;
      return {
        ...state,
        conversation: convo,
        wellbeing: applyDelta(state.wellbeing, result.inferred),
        spriteState: result.spriteState,
        pendingRecommendation: result.recommendation ?? state.pendingRecommendation,
        memory: nextMemory,
        showSayMore: false,
        pendingInferences: result.proposedInferences,
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
      return {
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
    }

    case "setPanel":
      return { ...state, panel: action.panel };

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
      return { ...state, memory: confirmInf(state.memory, action.id) };

    case "wipeMemory":
      return { ...state, memory: deleteAllInferences() };

    case "toggleConsent":
      return {
        ...state,
        consent: { ...state.consent, [action.key]: !state.consent[action.key] },
      };

    case "triggerCrisis":
      return { ...state, crisis: { active: true, triggeredAt: new Date().toISOString() } };

    case "clearCrisis":
      return { ...state, crisis: { active: false, triggeredAt: null } };

    case "skipDays": {
      const days = action.days;
      // Gentle drift: rest & body drift toward center, spark dips a little
      const w = state.wellbeing;
      const drift = (v: number, target: number) => v + (target - v) * 0.25;
      const wellbeing = {
        rest: clamp(drift(w.rest, 50) - days * 1),
        body: clamp(drift(w.body, 48) - days * 1),
        spark: clamp(drift(w.spark, 40) - days * 2),
      };
      const inf: CompanionInference = {
        id: `inf_${Math.random().toString(36).slice(2, 8)}`,
        category: "absence",
        statement: `you were away for ${days} day${days > 1 ? "s" : ""}. no catching up required.`,
        sourceText: `simulated absence`,
        sourceDate: new Date().toISOString(),
        confidence: "high",
        userConfirmed: false,
        userCorrected: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const convo = pushMsg(state.conversation, "pocket", RETURN_PROMPT.question);
      return {
        ...state,
        wellbeing,
        spriteState: "low",
        simulatedDaysAway: state.simulatedDaysAway + days,
        currentPrompt: RETURN_PROMPT,
        conversation: convo,
        returnFlowActive: true,
        showSayMore: false,
        lastQuick: null,
        memory: state.consent.memoryEnabled ? addInference(state.memory, inf) : state.memory,
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
      const sig = petSignalService.buildSignal("quiet_spark");
      return { ...state, petSignal: sig };
    }

    case "receiveFriendNudge": {
      const nudge: FriendNudge = {
        id: `nudge_${Math.random().toString(36).slice(2, 8)}`,
        text: "thinking of you 👋",
        at: new Date().toISOString(),
        resolved: false,
      };
      return { ...state, friendNudge: nudge, panel: "yard" };
    }

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
      return {
        ...state,
        positiveMemories: [pm, ...state.positiveMemories],
        memory: state.consent.memoryEnabled ? addInference(state.memory, inf) : state.memory,
        spriteState: "celebrating",
      };
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

  // Hydrate from localStorage once
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const loaded = storageService.load<TamaState>();
    if (loaded) {
      // Handle return-after-absence: if last visit > 1 real day ago
      try {
        const last = new Date(loaded.lastVisit).getTime();
        const hoursAway = (Date.now() - last) / 36e5;
        if (hoursAway > 20) {
          dispatch({ type: "hydrate", state: loaded });
          setTimeout(() => dispatch({ type: "skipDays", days: Math.max(1, Math.floor(hoursAway / 24)) }), 300);
          return;
        }
      } catch {
        /* ignore */
      }
      dispatch({ type: "hydrate", state: loaded });
    }
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated.current) return;
    storageService.save({ ...state, lastVisit: new Date().toISOString() });
  }, [state]);

  // Hidden demo controls: Shift+D toggles panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        dispatch({
          type: "setPanel",
          panel: state.panel === "settings" ? null : "settings",
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.panel]);

  const exportMemory = useCallback(() => exportMemoryJSON(state.memory), [state.memory]);

  const value = useMemo(() => ({ state, dispatch, exportMemory }), [state, exportMemory]);
  return <TamaContext.Provider value={value}>{children}</TamaContext.Provider>;
}

export function useTama() {
  const ctx = useContext(TamaContext);
  if (!ctx) throw new Error("useTama must be used within TamaProvider");
  return ctx;
}
