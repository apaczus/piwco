import { useLocalSearchParams } from "expo-router";
import { GameFlow } from "../game/GameFlow";

// If the game crashes, show the error on the phone (with "Retry") instead of failing silently.
export { ErrorBoundary } from "expo-router";

// /game?industry=gastronomy, or /game?player=private (private person rated 3–5: investing + credit, no company)
export default function GameRoute() {
  const { industry, player } = useLocalSearchParams<{ industry?: string; player?: string }>();
  return <GameFlow industryId={typeof industry === "string" ? industry : null} privatePlayer={player === "private"} />;
}
