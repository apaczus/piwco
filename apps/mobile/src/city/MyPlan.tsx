// "My plan": real-world steps the player added after the event lessons (CITY page, and a summary on the year map).
import { StyleSheet, Text, View } from "react-native";
import { levels } from "@piwco/content";
import { colors, font, shadow2 } from "../theme";
import type { PlanItem } from "../game/session";

export function MyPlan({ plan, night = false, hideEmpty = false }: { plan: PlanItem[]; night?: boolean; hideEmpty?: boolean }) {
  if (plan.length === 0 && hideEmpty) return null;
  return (
    <View style={[styles.card, night ? styles.cardNight : null]}>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, night ? { color: colors.yellow } : null]}>MY PLAN</Text>
        <Text style={[styles.count, night ? { color: colors.onPetrolMuted } : null]}>
          {plan.length === 1 ? "1 step for real life" : `${plan.length} steps for real life`}
        </Text>
      </View>
      {plan.length === 0 ? (
        <Text style={[styles.empty, night ? { color: colors.onPetrolSub } : null]}>
          After a surprise, its lesson ends with one real-world step. Add it, and it shows up here.
        </Text>
      ) : (
        plan.map((p) => (
          <View key={`${p.month}-${p.eventId}`} style={styles.row}>
            <View style={[styles.box, night ? { borderColor: colors.onPetrolMuted } : null]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.title, night ? { color: colors.onPetrol } : null]}>{p.title}</Text>
              <Text style={[styles.detail, night ? { color: colors.onPetrolSub } : null]}>{p.detail}</Text>
              <Text style={[styles.month, night ? { color: colors.onPetrolMuted } : null]}>
                {`Added in ${levels.find((l) => l.month === p.month)?.monthName ?? `month ${p.month}`}`}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, ...shadow2 },
  cardNight: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", shadowOpacity: 0, elevation: 0 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1.1, color: colors.petrol700 },
  count: { fontFamily: font.bold, fontSize: 12, color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, marginTop: 2 },
  title: { fontFamily: font.extrabold, fontSize: 15.5, color: colors.petrol950 },
  detail: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  month: { fontFamily: font.semibold, fontSize: 12, color: colors.muted, marginTop: 2 },
});
