// "Where the money goes": one bar split into coloured parts (household budget, investing split).
// Plain flex parts: they follow a slider finger directly (an animation per change would lag behind it).
import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

export type MoneyPart = { key: string; value: number; color: string };

export function MoneyBar({ parts, total }: { parts: MoneyPart[]; total: number }) {
  const t = Math.max(1, total);
  return (
    <View style={styles.bar}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <View key={p.key} style={{ flex: p.value / t, backgroundColor: p.color }} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2, gap: 2 },
});
