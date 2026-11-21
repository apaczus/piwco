// Short UI sounds (synthetic WAVs in assets/sounds). Played together with haptics from `buzz()`.
// Respects the iPhone silent switch; on Android it follows the media volume. The in-game speaker icon
// mutes everything (kept in memory until the app is closed). A failing sound never breaks the game.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useSyncExternalStore } from "react";

export type SoundName = "pop" | "coin" | "success" | "error" | "whoosh";

const SOURCES: Record<SoundName, number> = {
  pop: require("../assets/sounds/pop.wav"),
  coin: require("../assets/sounds/coin.wav"),
  success: require("../assets/sounds/success.wav"),
  error: require("../assets/sounds/error.wav"),
  whoosh: require("../assets/sounds/whoosh.wav"),
};

let players: Partial<Record<SoundName, AudioPlayer>> | null = null;

function init(): Partial<Record<SoundName, AudioPlayer>> {
  if (players) return players;
  players = {};
  // Silent switch on = no sounds; mix with the player's music instead of stopping it.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch {
      // Leave this sound out.
    }
  }
  return players;
}

// Load the sounds early so the first one plays without a delay.
export function preloadSounds() {
  init();
}

export function playSound(name: SoundName) {
  if (muted) return;
  try {
    const p = init()[name];
    if (!p) return;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Ignore: sound is decoration.
  }
}

// ---------- Mute (speaker icon) ----------

let muted = false;
const listeners = new Set<() => void>();

export function setMuted(value: boolean) {
  muted = value;
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
}
