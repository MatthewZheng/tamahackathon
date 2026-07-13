import { useState } from "react";
import { useTama, type SpriteTint, type SpriteSpecies, type ShellTheme, type OverlayShape, type OverlaySize } from "@/lib/tama/store";
import { PocketSprite } from "./PocketSprite";

const SPECIES: Array<{ id: SpriteSpecies; label: string }> = [
  { id: "blob", label: "blob" },
  { id: "cat", label: "cat" },
  { id: "dog", label: "dog" },
  { id: "bunny", label: "bunny" },
];

const TINTS: Array<{ id: SpriteTint; label: string }> = [
  { id: "default", label: "classic" },
  { id: "peach", label: "peach" },
  { id: "mint", label: "mint" },
  { id: "lilac", label: "lilac" },
];
const THEMES: Array<{ id: ShellTheme; label: string }> = [
  { id: "classic", label: "classic" },
  { id: "midnight", label: "midnight" },
  { id: "blossom", label: "blossom" },
  { id: "moss", label: "moss" },
];
const SHAPES: Array<{ id: OverlayShape; label: string }> = [
  { id: "shell", label: "shell" },
  { id: "round", label: "round" },
  { id: "egg", label: "egg" },
];
const SIZES: Array<{ id: OverlaySize; label: string }> = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
];

export function Onboarding() {
  const { state, dispatch } = useTama();
  const [userName, setUserName] = useState("");
  const [petName, setPetName] = useState("");
  const [tint, setTint] = useState<SpriteTint>("default");
  const [shellTheme, setShellTheme] = useState<ShellTheme>("classic");
  const [overlayShape, setOverlayShape] = useState<OverlayShape>("shell");
  const [overlaySize, setOverlaySize] = useState<OverlaySize>("m");
  const [species, setSpecies] = useState<SpriteSpecies>("blob");

  const skip = () => {
    dispatch({
      type: "completeOnboarding",
      userName: state.userName,
      petName: state.petName,
      spriteTint: "default",
    });
  };
  const start = () => {
    dispatch({
      type: "completeOnboarding",
      userName: userName.trim() || state.userName,
      petName: petName.trim() || state.petName,
      spriteTint: tint,
      spriteSpecies: species,
      shellTheme,
      overlayShape,
      overlaySize,
    });
  };

  const previewPetName = (petName.trim() || state.petName).toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream/80 p-4 backdrop-blur-sm">
      <div className={`shell-${shellTheme} animate-tama-fade-in w-full max-w-md rounded-3xl border border-charcoal/10 bg-cream p-6 shadow-2xl`}>
        {/* preview sprite */}
        <div className="mx-auto mb-4 flex flex-col items-center">
          <div className={`overlay-shape-${overlayShape} lcd-screen scanlines scanlines-after flex h-28 w-28 items-center justify-center overflow-hidden`}>
            <PocketSprite state="perked" size={80} tint={tint} species={species} ariaName={previewPetName} />
          </div>
          <p className="mt-2 text-[11px] italic text-charcoal/60">
            hi. i'll be a small companion, not a chore.
          </p>
        </div>


        <h2 className="text-lg font-semibold text-charcoal">welcome to tama</h2>
        <p className="mt-1 text-xs text-charcoal/60">
          skippable in under 15 seconds. defaults are fine.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-charcoal/60">what should i call you?</label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value.slice(0, 24))}
              placeholder={state.userName.toLowerCase()}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-orchid"
            />
          </div>
          <div>
            <label className="text-xs text-charcoal/60">
              and what's this little one's name?
            </label>
            <input
              value={petName}
              onChange={(e) => setPetName(e.target.value.slice(0, 24))}
              placeholder={state.petName.toLowerCase()}
              className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white/70 px-3 py-2 text-sm text-charcoal outline-none focus:border-orchid"
            />
          </div>

          <div>
            <p className="text-xs text-charcoal/60">pick a palette</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {TINTS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTint(t.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    tint === t.id
                      ? "border-orchid bg-orchid/10 text-charcoal"
                      : "border-charcoal/15 bg-white/60 text-charcoal/70"
                  }`}
                >
                  <span className="lcd-screen flex h-4 w-4 items-center justify-center overflow-hidden rounded-full">
                    <PocketSprite state="idle" size={16} tint={t.id} reducedMotion />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <details className="rounded-lg border border-charcoal/10 bg-white/40 px-2 py-1.5">
            <summary className="cursor-pointer text-xs text-charcoal/60">more looks (optional)</summary>
            <div className="mt-2 space-y-2">
              <ChipRow label="species" options={SPECIES} value={species} onChange={setSpecies} />
              <ChipRow label="shell" options={THEMES} value={shellTheme} onChange={setShellTheme} />
              <ChipRow label="shape" options={SHAPES} value={overlayShape} onChange={setOverlayShape} />
              <ChipRow label="size" options={SIZES} value={overlaySize} onChange={setOverlaySize} />
            </div>
          </details>
        </div>


        <div className="mt-4 space-y-2 rounded-xl border border-charcoal/10 bg-white/60 p-3 text-xs text-charcoal/75">
          <p>
            <span className="font-semibold text-charcoal">memory.</span> {previewPetName}{" "}
            may notice small things you say and keep them nearby. you can see, edit,
            or delete everything from "what {previewPetName} noticed".
          </p>
          <p>
            <span className="font-semibold text-charcoal">pet signals.</span> if you
            let it, {previewPetName} can nudge a friend's pet — never your words,
            moods, or meters. real contact happens outside the screen.
          </p>
          <p>
            <span className="font-semibold text-charcoal">consent.</span> all of this
            is off-by-toggle in settings. no streaks. no guilt. pocket runs on your
            device first — replies are generated by an AI service, and memory sync
            and friend signals are optional, visible, and deletable.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={skip}
            className="rounded-full px-3 py-2 text-xs text-charcoal/60 hover:bg-charcoal/5"
          >
            skip — use defaults
          </button>
          <button
            onClick={start}
            className="rounded-full bg-orchid px-5 py-2 text-sm font-medium text-cream hover:opacity-90"
          >
            meet {previewPetName}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] uppercase tracking-wider text-charcoal/50">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              value === o.id
                ? "border-orchid bg-orchid/10 text-charcoal"
                : "border-charcoal/15 bg-white/60 text-charcoal/70"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

