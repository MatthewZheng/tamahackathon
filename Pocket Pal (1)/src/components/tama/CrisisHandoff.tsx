import { useTama } from "@/lib/tama/store";

export function CrisisHandoff() {
  const { state, dispatch } = useTama();
  if (!state.crisis.active) return null;

  const trustedMsg =
    "I'm having a hard time and I don't feel safe being alone right now. Can you stay with me or help me get support?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 backdrop-blur">
      <div className="max-w-lg rounded-3xl border border-charcoal/10 bg-cream p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-charcoal">a real person can help.</h2>
        <p className="mt-2 text-sm text-charcoal/80">
          I&apos;m really glad you told me. I&apos;m a companion, and I&apos;m not equipped to keep you safe by myself.
          Please connect with a person who can help right now.
        </p>
        <div className="mt-4 space-y-2">
          <a
            href="tel:988"
            className="flex items-center justify-between rounded-xl bg-orchid px-4 py-3 text-sm font-semibold text-cream"
          >
            <span>Call 988</span>
            <span className="opacity-80">Suicide & Crisis Lifeline</span>
          </a>
          <a
            href="sms:988"
            className="flex items-center justify-between rounded-xl border border-orchid/40 bg-orchid/10 px-4 py-3 text-sm font-semibold text-orchid"
          >
            <span>Text 988</span>
            <span className="opacity-70">available 24/7</span>
          </a>
          <a
            href="tel:911"
            className="flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
          >
            <span>Call emergency services (911)</span>
            <span className="opacity-70">immediate danger</span>
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(trustedMsg)}
            className="flex w-full items-center justify-between rounded-xl border border-charcoal/15 bg-white/70 px-4 py-3 text-left text-sm"
          >
            <span>
              <span className="block font-semibold text-charcoal">Copy message to a trusted person</span>
              <span className="block text-xs text-charcoal/60">"{trustedMsg}"</span>
            </span>
            <span className="text-xs text-charcoal/50">copy</span>
          </button>
        </div>

        <p className="mt-4 text-xs italic text-charcoal/60">
          Tama supports general wellness and reflection. It is not medical care, therapy, diagnosis, or emergency support.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => dispatch({ type: "clearCrisis" })}
            className="rounded-full border border-charcoal/15 px-4 py-2 text-sm text-charcoal/70"
          >
            i am not in immediate danger
          </button>
          <button
            onClick={() => dispatch({ type: "clearCrisis" })}
            className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream"
          >
            return to support resources
          </button>
        </div>
      </div>
    </div>
  );
}
