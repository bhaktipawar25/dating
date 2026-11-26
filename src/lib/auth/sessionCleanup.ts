type CleanupCallback = () => void;

const cleanupCallbacks = new Set<CleanupCallback>();

/**
 * Registers active WebSockets, WebRTC peer connections, media tracks, or
 * ephemeral client state so logout tears everything down deterministically.
 */
export function registerLogoutCleanup(callback: CleanupCallback): () => void {
  cleanupCallbacks.add(callback);
  return () => {
    cleanupCallbacks.delete(callback);
  };
}

export function runAllLogoutCleanups(): void {
  for (const callback of Array.from(cleanupCallbacks)) {
    try {
      callback();
    } catch {
      // Continue running remaining cleanups safely
    }
  }
}
