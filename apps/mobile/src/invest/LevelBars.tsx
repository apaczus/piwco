// Return / Risk as 5 small bars (0–5): the instrument cards and the lesson's info cards.
import { StyleSheet, Text, View } from "react-native";
import { colors, font } from "../theme";

export function LevelBars({ label, value, color, big }: { label: string; value: number; color: string; big?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, big ? styles.labelBig : null]}>{label}</Text>
      <View style={styles.bars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.bar, big ? styles.barBig : null, { backgroundColor: i <= value ? color : colors.surface2 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted },
  labelBig: { fontSize: 14, minWidth: 52 },
  bars: { flexDirection: "row", gap: 3 },
  bar: { width: 12, height: 6, borderRadius: 3 },
  barBig: { width: 22, height: 10, borderRadius: 5 },
});
