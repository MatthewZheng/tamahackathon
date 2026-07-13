// Dev-mode Electron shell. Loads the already-running Vite dev server
// (`npm run dev`) as two transparent, always-on-top, resizable overlay
// windows — one per local-pairing slot (?as=a / ?as=b), positioned side by
// side automatically. Not a production/packaged build.
import { app, BrowserWindow, screen } from "electron";

const DEV_URL = "http://localhost:8080";
const MARGIN = 24;
const MAX_WIDTH = 460;
const MAX_HEIGHT = 640;

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // dev server not up yet — keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function createOverlayWindow(x, y, width, height, slot) {
  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 260,
    minHeight: 260,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
    },
  });
  win.loadURL(`${DEV_URL}/?electron=1&as=${slot}`);
  return win;
}

app.whenReady().then(async () => {
  const ok = await waitForServer(DEV_URL);
  if (!ok) {
    console.error(`[electron] could not reach ${DEV_URL} — start "npm run dev" first.`);
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.min(MAX_WIDTH, Math.floor(screenW / 2) - MARGIN * 2);
  const winH = Math.min(MAX_HEIGHT, screenH - MARGIN * 2);

  createOverlayWindow(MARGIN, MARGIN, winW, winH, "a");
  createOverlayWindow(screenW - winW - MARGIN, MARGIN, winW, winH, "b");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow(MARGIN, MARGIN, winW, winH, "a");
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
