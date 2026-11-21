// CITY page of the game screen: the city as it will look at the end of this month (forecast, same as the HUD),
// net worth, the 2×2 level cards and a hint card when a building is tapped. Daytime look (the month is running).
import type { BuildingId, CityView } from "@piwco/engine";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { buzz, Enter } from "../onboarding/anim";
import { Eyebrow, Panel } from "../onboarding/ui";
import { colors, font } from "../theme";
import { RollingNumber } from "../game/RollingNumber";
import { useLevelUp, type Levels } from "./levelUp";
import { BuildingCards } from "./BuildingCards";
import { BUILDING_INFO, buildingHint } from "./buildings";
import { CityScene } from "./CityScene";
import type { CityConfig } from "@piwco/engine";
import { repairing, type PlanItem } from "../game/session";
import { MyPlan } from "./MyPlan";

export function CityPage({
  city,
  netWorth,
  config,
  shown,
  shownWorth,
  plan,
  active,
  onSeen,
}: {
  // "My plan" items (real-world steps from the event lessons); they also put scaffolding on damaged buildings.
  plan: PlanItem[];
  city: CityView;
  netWorth: number;
  config: CityConfig;
  // Levels / net worth the player has already seen; the difference plays as a level up when the page is active.
  shown: Levels;
  shownWorth: number;
  active: boolean;
  onSeen: () => void;
}) {
  const [picked, setPicked] = useState<BuildingId | null>(null);
  const lu = useLevelUp({ current: city.levels, shown, active, onSeen });
  const shownCity = { ...city, levels: lu.display };
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Eyebrow>Your city</Eyebrow>
      <View style={styles.worthRow}>
        <Text style={styles.worthLabel}>Net worth at month end</Text>
        <View style={styles.worthPill}>
          <RollingNumber value={lu.waiting ? shownWorth : netWorth} from={shownWorth} duration={650} style={styles.worthValue} />
        </View>
      </View>
      <CityScene
        city={shownCity}
        decorate={lu.decorate}
        repairing={repairing(plan, city.damaged)}
        onPressBuilding={(id) => {
          buzz("tick");
          setPicked((p) => (p === id ? null : id));
        }}
      />
      {picked ? (
        <Enter key={picked} from="below" distance={10}>
          <Panel title={BUILDING_INFO[picked].name} text={buildingHint(picked, shownCity.levels[picked], config)} />
        </Enter>
      ) : (
        <Text style={styles.tapHint}>Tap a building to see how it grows.</Text>
      )}
      <BuildingCards city={shownCity} barFor={lu.barFor} />
      <MyPlan plan={plan} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, marginHorizontal: -18 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 14 },
  worthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  worthLabel: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
  worthPill: { backgroundColor: colors.yellow, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14 },
  worthValue: { fontFamily: font.extrabold, fontSize: 20, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  tapHint: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, textAlign: "center" },
});
