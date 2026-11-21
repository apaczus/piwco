// 2×2 grid under the city: name, "Lv n" / "empty" and a 0–3 progress bar per building (Future tower is left out:
// it can't be built in the MVP). `barFor` lets the level-up animation drive the bar widths later.
import type { BuildingId, CityView } from "@piwco/engine";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font } from "../theme";
import { BUILDING_INFO } from "./buildings";

export const CARD_BUILDINGS: BuildingId[] = ["home", "firm", "vault", "shield"];

export function BuildingCards({
  city,
  night = false,
  barFor,
  ids = CARD_BUILDINGS,
}: {
  // Which buildings get a card (2×2; the default leaves the Future tower out).
  ids?: BuildingId[];
  city: CityView;
  night?: boolean;
  barFor?: (id: BuildingId, color: string) => ReactNode;
}) {
  return (
    <View style={styles.grid}>
      {ids.map((id) => {
        const level = city.levels[id];
        const info = BUILDING_INFO[id];
        return (
          <View key={id} style={[styles.card, night ? styles.cardNight : styles.cardDay]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: info.color }]} />
              <Text style={[styles.name, { color: night ? colors.onPetrol : colors.ink }]} numberOfLines={1}>
                {info.name}
              </Text>
            </View>
            <Text style={[styles.level, { color: level > 0 ? (night ? colors.yellow : colors.petrol800) : night ? colors.onPetrolMuted : colors.muted }]}>
              {level > 0 ? `Lv ${level}` : "empty"}
            </Text>
            <View style={[styles.track, { backgroundColor: night ? "rgba(255,255,255,0.14)" : colors.surface2 }]}>
              {barFor ? barFor(id, info.color) : <View style={[styles.fill, { width: `${(level / 3) * 100}%`, backgroundColor: info.color }]} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { flexBasis: "47%", flexGrow: 1, borderRadius: 14, padding: 12, gap: 4 },
  cardDay: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  cardNight: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  name: { flex: 1, fontFamily: font.bold, fontSize: 13.5 },
  level: { fontFamily: font.extrabold, fontSize: 18 },
  track: { height: 7, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});
