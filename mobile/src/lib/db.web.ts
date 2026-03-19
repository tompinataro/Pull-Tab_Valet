// Web/Desktop (Electron) local storage.
//
// For the desktop app we run the React Native Web bundle inside Electron.
// We cannot rely on expo-sqlite on web (wasm asset issues), so we use an IPC bridge
// exposed by Electron preload: `window.ptvDesktop.db.*`.
//
// In a normal browser (non-Electron), these APIs are unavailable; callers should
// treat this as "no local DB" and degrade gracefully.

type DesktopBridge = {
  db?: {
    ensureSchema: () => Promise<any>;
    upsertScan: (venueId: string, upc: string) => Promise<any>;
    countQueuedForVenue: (venueId: string) => Promise<{ ok: boolean; count: number }>;
  };
};

function getDesktopBridge(): DesktopBridge | null {
  const g: any = globalThis as any;
  return g?.ptvDesktop ?? null;
}

export async function ensureSchema() {
  const desktop = getDesktopBridge();
  if (desktop?.db) {
    await desktop.db.ensureSchema();
  }
}

export async function upsertScan(venueId: string, upcRaw: string) {
  const upc = String(upcRaw || '').trim();
  if (!venueId || !upc) return;

  const desktop = getDesktopBridge();
  if (desktop?.db) {
    await desktop.db.upsertScan(venueId, upc);
  }
}

export async function countQueuedForVenue(venueId: string): Promise<number> {
  const desktop = getDesktopBridge();
  if (desktop?.db) {
    const res = await desktop.db.countQueuedForVenue(venueId);
    return Number(res?.count ?? 0);
  }
  return 0;
}
