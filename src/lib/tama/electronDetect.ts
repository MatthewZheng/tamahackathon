// Detects the dev-mode Electron overlay shell (electron/main.js), which
// loads this app with `?electron=1` in the URL. No native bridge/preload
// needed — window close is a plain `window.close()`, dragging is CSS-only
// (`-webkit-app-region`), both of which Electron handles natively.
export function isElectronOverlay(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("electron") === "1";
}
