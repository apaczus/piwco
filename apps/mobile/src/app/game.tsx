import { useLocalSearchParams } from "expo-router";
import { GameFlow } from "../game/GameFlow";

// If the game crashes, show the error on the phone (with "Retry") instead of failing silently.
export { ErrorBoundary } from "expo-router";

// /game?industry=gastronomy
export default function GameRoute() {
  const { industry } = useLocalSearchParams<{ industry?: string }>();
  return <GameFlow industryId={typeof industry === "string" ? industry : null} />;
}
