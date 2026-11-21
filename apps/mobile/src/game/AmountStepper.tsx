// Amount input without a keyboard: a big number with −500 / −100 / +100 / +500 buttons (decided).
import { StyleSheet, Text, View } from "react-native";
import { buzz, PressScale } from "../onboarding/anim";
import { colors, font } from "../theme";
import { RollingNumber } from "./RollingNumber";

const STEPS = [-500, -100, 100, 500] as const;

function StepButton({
  step,
  disabled,
  small,
  onPress,
}: {
  step: number;
  disabled: boolean;
  small: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${step > 0 ? "Add" : "Remove"} ${Math.abs(step)}`}
      style={[styles.step, small ? styles.stepSmall : null, disabled ? styles.stepDisabled : null]}
    >
      <Text style={[styles.stepText, small ? styles.stepTextSmall : null]}>
        {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
      </Text>
    </PressScale>
  );
}

export function AmountStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  // Compact = one row (used in the budget list); default = big number above the buttons.
  compact?: boolean;
}) {
  const press = (step: number) => {
    const next = Math.min(max, Math.max(min, value + step));
    if (next !== value) {
      buzz("tick");
      onChange(next);
    }
  };
  const buttons = (steps: readonly number[]) =>
    steps.map((s) => (
      <StepButton
        key={s}
        step={s}
        small={compact}
        disabled={s < 0 ? value <= min : value >= max}
        onPress={() => press(s)}
      />
    ));

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {buttons(STEPS.slice(0, 2))}
        <RollingNumber value={value} duration={260} containerStyle={{ flex: 1 }} style={styles.compactValue} numberOfLines={1} />
        {buttons(STEPS.slice(2))}
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <RollingNumber value={value} duration={300} style={styles.big} />
      <View style={styles.row}>{buttons(STEPS)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: {
    fontFamily: font.extrabold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
    color: colors.petrol950,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  step: {
    minWidth: 64,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  stepSmall: { minWidth: 0, paddingVertical: 8, paddingHorizontal: 7, borderRadius: 10 },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontFamily: font.extrabold, fontSize: 15, color: colors.petrol800 },
  stepTextSmall: { fontSize: 12.5 },
  compactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  compactValue: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.extrabold,
    fontSize: 16,
    color: colors.petrol950,
    fontVariant: ["tabular-nums"],
  },
});
