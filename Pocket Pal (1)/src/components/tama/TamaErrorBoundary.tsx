import { Component, type ReactNode } from "react";

type State = { hasError: boolean; error: Error | null };

export class TamaErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("[Tama]", error);
  }
  render() {
    if (this.state.hasError) {
      let petName = "pocket";
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem("tama.state.v1") : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.petName) petName = String(parsed.petName).toLowerCase();
        }
      } catch {}
      return (
        <div className="flex min-h-screen items-center justify-center bg-cream p-6">
          <div className="max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 text-center shadow-lg">
            <h2 className="text-lg font-semibold text-charcoal">
              {petName} is having a quiet moment.
            </h2>
            <p className="mt-2 text-sm text-charcoal/70">
              nothing broke while you were gone. try reloading — your local data is safe.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="mt-4 rounded-full bg-orchid px-4 py-2 text-sm font-medium text-cream"
            >
              reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
