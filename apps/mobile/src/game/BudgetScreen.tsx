// Household budget: split the month's personal money into 6 categories (decided: separate screen).
// Top: one bar of the personal account split by category colours, "Left" (green) or "Missing" (red), live.
// Below: a slider per category (drag or − / +). A slider glows red below its minimum ("Too little"), and the
// bills the money won't reach (paid in order at the month end) get a red frame.
import { HOUSEHOLD_CATEGORIES, type GameState, type HouseholdCategory } from "@piwco/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, LinkButton, Title, Why } from "../onboarding/ui";
import { colors, font, mix, shadow1 } from "../theme";
import { BudgetSlider } from "./BudgetSlider";
import { categoryLabel, formatPln } from "./format";

const COLORS: Record<HouseholdCategory, string> = {
  housing: colors.petrol700,
  food: "#22A088",
  car_transport: "#2C7DA6",
  insurance: "#0B4F5C",
  savings: "#F2C200",
  other: "#8A9BA0",
};

const HINTS: Partial<Record<HouseholdCategory, string>> = {
  savings: "goes to your safety cushion",
  car_transport: "fuel, tickets, repairs",
  insurance: "your policies",
  other: "everything else",
};

// Bills are paid in this order at the month end; savings only from what is left.
const PAY_ORDER: HouseholdCategory[] = ["housing", "food", "car_transport", "insurance", "other"];

export function BudgetScreen({
  state,
  dir,
  onSave,
  onCancel,
}: {
  state: GameState;
  dir: Dir;
  onSave: (spending: Record<HouseholdCategory, number>) => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState<Record<HouseholdCategory, number>>({ ...state.personal.monthlySpending });
  const planned = HOUSEHOLD_CATEGORIES.reduce((s, c) => s + draft[c], 0);
  const installment = Math.min(state.personal.debt.monthlyInstallment, state.personal.debt.balance);
  const available = Math.max(0, state.personal.cash - installment);
  const left = available - planned;

  // Which bills the money won't reach (in payment order).
  const short = new Set<HouseholdCategory>();
  let rest = available;
  for (const c of PAY_ORDER) {
    if (draft[c] > rest) short.add(c);
    rest = Math.max(0, rest - draft[c]);
  }
  if (draft.savings > rest) short.add("savings");

  // Slider range, fixed for the screen (a range that moves while dragging feels jumpy): the money there is
  // (rounded up), never less than the starting amount or twice a category's minimum.
  const [ranges] = useState(() =>
    Object.fromEntries(
      HOUSEHOLD_CATEGORIES.map((c) => [
        c,
        Math.max(500, Math.ceil(Math.max(available, state.personal.monthlySpending[c], state.personal.minimumSpending[c] * 2) / 500) * 500),
      ]),
    ) as Record<HouseholdCategory, number>,
  );
  // Stable, so only the dragged slider re-renders (sliders are memoized).
  const onSlide = useCallback((id: string, v: number) => setDraft((d) => ({ ...d, [id]: v })), []);

  // The summary bar flashes red when the plan tips into "Missing".
  const missing = left < 0;
  const wasMissing = useRef(missing);
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (missing && !wasMissing.current) {
      buzz("medium", "error");
      if (!reduced) {
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      }
    } else if (!missing && wasMissing.current) {
      buzz("success", null);
    }
    wasMissing.current = missing;
  }, [missing, reduced, flash]);

  const total = Math.max(available, planned, 1);
  const belowMin = HOUSEHOLD_CATEGORIES.some((c) => draft[c] < state.personal.minimumSpending[c]);

  return (
    <ScreenLayout
      dir={dir}
      footer={
        <>
          <Cta label={missing || belowMin ? "Save anyway" : "Save budget ✓"} onPress={() => onSave(draft)} />
          <LinkButton label="Cancel" onPress={onCancel} />
        </>
      }
    >
      <Eyebrow>Household budget</Eyebrow>
      <Title>Where does your money go this month?</Title>
      <Why>Drag each slider. Housing and food can't go below their minimum. The bar shows if the money is enough.</Why>

      <View style={[styles.summary, missing ? styles.summaryMissing : null]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: Animated.multiply(flash, 0.25) }]} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{`On your account${installment > 0 ? " (after the loan)" : ""}`}</Text>
          <Text style={styles.summaryValue}>{formatPln(available)}</Text>
        </View>
        <View style={styles.bar}>
          {/* Plain flex parts: they follow the finger directly (an animation per change would lag behind it). */}
          {HOUSEHOLD_CATEGORIES.filter((c) => draft[c] > 0).map((c) => (
            <View key={c} style={{ flex: draft[c] / total, backgroundColor: short.has(c) ? colors.danger : COLORS[c] }} />
          ))}
          {left > 0 ? <View style={{ flex: left / total, backgroundColor: mix(colors.success, colors.surface, 28) }} /> : null}
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.leftLabel, { color: missing ? colors.danger : colors.success }]}>{missing ? "Missing" : "Left"}</Text>
          <Text style={[styles.leftValue, { color: missing ? colors.danger : colors.success }]}>{formatPln(Math.abs(left))}</Text>
        </View>
        {missing ? <Text style={styles.tip}>Pay yourself more from the company, or move the sliders down.</Text> : null}
      </View>

      <View style={styles.list}>
        {HOUSEHOLD_CATEGORIES.map((c) => (
          <BudgetSlider
            key={c}
            label={categoryLabel(c)}
            hint={HINTS[c]}
            value={draft[c]}
            id={c}
            max={ranges[c]}
            minimum={state.personal.minimumSpending[c]}
            color={COLORS[c]}
            shortfall={short.has(c) && c !== "savings"}
            onChange={onSlide}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1.5, borderColor: colors.line, overflow: "hidden", ...shadow1 },
  summaryMissing: { borderColor: colors.danger },
  flash: { backgroundColor: colors.danger },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: font.bold, fontSize: 15, color: colors.ink, fontVariant: ["tabular-nums"] },
  bar: { flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2, gap: 2 },
  leftLabel: { fontFamily: font.extrabold, fontSize: 16 },
  leftValue: { fontFamily: font.extrabold, fontSize: 22, fontVariant: ["tabular-nums"] },
  tip: { fontFamily: font.semibold, fontSize: 13, color: colors.danger },
  list: { gap: 10 },
});
