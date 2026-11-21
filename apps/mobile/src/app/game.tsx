import { useLocalSearchParams } from "expo-router";
import { GameFlow } from "../game/GameFlow";

// If the game crashes, show the error on the phone (with "Retry") instead of failing silently.
export { ErrorBoundary } from "expo-router";

// /game?industry=gastronomy (&chapter=invest: TEMPORARY dev entry into the investing chapter)
export default function GameRoute() {
  const { industry, chapter } = useLocalSearchParams<{ industry?: string; chapter?: string }>();
  return <GameFlow industryId={typeof industry === "string" ? industry : null} startChapter={chapter === "invest" ? "invest" : null} />;
}
