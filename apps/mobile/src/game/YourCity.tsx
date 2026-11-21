// "The goal + your city" (user, 2026-11-21): after "You skip the first 3 months", before "How Piwco works".
// The goal of the game (a strong city at the end of the year), the player's real city now ("n of 5 buildings"),
// then one row per building (what it is, what builds it) sliding in one by one. Daytime. Texts in tutorial.json.
import { tutorial } from "@piwco/content";
import { BUILDINGS, type BuildingId, type CityView } from "@piwco/engine";
import { StyleSheet, Text, View } from "react-native";
import { BUILDING_INFO } from "../city/buildings";
import { usePrivatePlayer } from "./privatePlayer";
import { CityScene } from "../city/CityScene";
import { Enter } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Sub, Title } from "../onboarding/ui";
import { colors, font, shadow2 } from "../theme";

export function YourCity({ dir, city, onNext }: { dir: Dir; city: CityView; onNext: () => void }) {
  const t = tutorial.yourCity;
  // Private persons have no Company building (4 buildings).
  const priv = usePrivatePlayer();
  const ids = BUILDINGS.filter((id) => !(priv && id === "firm"));
  const rows = t.buildings.filter((b) => !(priv && b.id === "firm"));
  const built = ids.filter((id) => city.levels[id] > 0).length;
  return (
    <ScreenLayout dir={dir} footer={<Cta label={t.cta} onPress={onNext} appear />}>
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <Title>{t.title}</Title>
      <Sub>{t.sub}</Sub>
      <View style={styles.cityCard}>
        <Text style={styles.stage}>{t.stage.replace("{built}", String(built)).replace("{total}", String(ids.length))}</Text>
        <CityScene city={city} />
      </View>
      <View style={{ gap: 6 }}>
        {rows.map((b, i) => {
          const id = b.id as BuildingId;
          const info = BUILDING_INFO[id];
          if (!info) return null;
          const level = city.levels[id] ?? 0;
          return (
            <Enter key={b.id} from="below" delay={300 + i * 140}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: info.color }]} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.name}>
                    {`${info.name} · `}
                    <Text style={styles.what}>{b.what}</Text>
                  </Text>
                  <Text style={styles.grows}>{b.grows}</Text>
                </View>
                <Text style={[styles.level, level === 0 ? { color: colors.muted } : null]}>{level > 0 ? `Lv ${level}` : "empty"}</Text>
              </View>
            </Enter>
          );
        })}
      </View>
      <Enter from="below" delay={300 + rows.length * 140}>
        <Text style={styles.rule}>{t.rule}</Text>
      </Enter>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  cityCard: { backgroundColor: colors.surface, borderRadius: 18, paddingTop: 12, paddingHorizontal: 8, overflow: "hidden", ...shadow2 },
  stage: { fontFamily: font.extrabold, fontSize: 14, color: colors.petrol800, paddingHorizontal: 6, paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  what: { fontFamily: font.semibold, fontSize: 14, color: colors.petrol700 },
  grows: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  level: { fontFamily: font.extrabold, fontSize: 13, color: colors.petrol800 },
  rule: { fontFamily: font.extrabold, fontSize: 15, lineHeight: 21, color: colors.petrol900, textAlign: "center" },
});
