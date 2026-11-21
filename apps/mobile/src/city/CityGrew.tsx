// After a completed month: lesson -> "Your city grew" -> roadmap. Night scene of the real (settled) state.
// Plays the month's level up (Home +1 for the completed month, plus anything not seen during the month).
import type { BuildingId, CityView } from "@piwco/engine";
import { StyleSheet, Text, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta } from "../onboarding/ui";
import { colors, font } from "../theme";
import { RollingNumber } from "../game/RollingNumber";
import { useLevelUp, type Levels } from "./levelUp";
import { BuildingCards } from "./BuildingCards";
import { CityScene } from "./CityScene";

export function CityGrew({
  city,
  netWorth,
  shown,
  shownWorth,
  onSeen,
  monthName,
  dir,
  onContinue,
  repairing,
  title = "Your city grew!",
  cards,
}: {
  title?: string;
  // Buildings with a card (default: Home, Company, Cushion vault, Protection).
  cards?: BuildingId[];
  repairing?: { home: boolean; firm: boolean };
  city: CityView;
  netWorth: number;
  // What the player saw last (end of the month's play); the difference plays as the month's level up.
  shown: Levels;
  shownWorth: number;
  onSeen: () => void;
  monthName: string;
  dir: Dir;
  onContinue: () => void;
}) {
  const lu = useLevelUp({ current: city.levels, shown, active: true, onSeen });
  const shownCity = { ...city, levels: lu.display };
  return (
    <ScreenLayout dir={dir} footer={<Cta label="See your year" onPress={onContinue} />}>
      <Text style={styles.eyebrow}>{`${monthName.toUpperCase()} · YOUR CITY`}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.worth}>
        <Text style={styles.worthLabel}>Net worth</Text>
        <RollingNumber value={lu.waiting ? shownWorth : netWorth} from={shownWorth} duration={650} style={styles.worthValue} />
      </View>
      <CityScene city={shownCity} night decorate={lu.decorate} repairing={repairing} />
      <BuildingCards city={shownCity} night barFor={lu.barFor} ids={cards} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1.1, color: colors.yellow },
  title: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36, color: colors.onPetrol },
  worth: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  worthLabel: { fontFamily: font.bold, fontSize: 14, color: colors.onPetrolSub },
  worthValue: { fontFamily: font.extrabold, fontSize: 26, color: colors.yellow, fontVariant: ["tabular-nums"] },
});
