// Household budget: split the month's personal money into 6 categories (decided: separate screen).
import { HOUSEHOLD_CATEGORIES, type GameState, type HouseholdCategory } from "@piwco/engine";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, LinkButton, Title, Why } from "../onboarding/ui";
import { colors, font, shadow1 } from "../theme";
import { AmountStepper } from "./AmountStepper";
import { categoryLabel, formatPln } from "./format";

const HINTS: Partial<Record<HouseholdCategory, string>> = {
  savings: "goes to your safety cushion",
};

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
  const [draft, setDraft] = useState<Record<HouseholdCategory, number>>({ ...state.personal.monthlySpending });
  const planned = HOUSEHOLD_CATEGORIES.reduce((s, c) => s + draft[c], 0);
  const installment = Math.min(state.personal.debt.monthlyInstallment, state.personal.debt.balance);
  const available = state.personal.cash - installment;
  const left = available - planned;

  return (
    <ScreenLayout
      dir={dir}
      footer={
        <>
          <Cta label="Save budget" onPress={() => onSave(draft)} />
          <LinkButton label="Cancel" onPress={onCancel} />
        </>
      }
    >
      <Eyebrow>Household budget</Eyebrow>
      <Title>Plan your home's spending for the month</Title>
      <Why>Housing and food have a minimum: rent and groceries can't wait. Spending less leaves unpaid bills.</Why>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>On your personal account</Text>
          <Text style={styles.summaryValue}>{formatPln(state.personal.cash)}</Text>
        </View>
        {installment > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Loan installment</Text>
            <Text style={styles.summaryValue}>{`−${formatPln(installment)}`}</Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Planned</Text>
          <Text style={styles.summaryValue}>{`−${formatPln(planned)}`}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, styles.bold]}>{left >= 0 ? "Left" : "Missing"}</Text>
          <Text style={[styles.summaryValue, styles.bold, left < 0 ? { color: colors.danger } : { color: colors.success }]}>
            {formatPln(Math.abs(left))}
          </Text>
        </View>
        {left < 0 ? (
          <Text style={styles.tip}>Pay yourself more from the company, or plan a smaller budget.</Text>
        ) : null}
      </View>

      <View style={styles.list}>
        {HOUSEHOLD_CATEGORIES.map((c) => {
          const min = state.personal.minimumSpending[c];
          const belowMin = draft[c] < min;
          return (
            <View key={c} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.rowLabel}>{categoryLabel(c)}</Text>
                <Text style={[styles.rowHint, belowMin ? { color: colors.danger } : null]}>
                  {min > 0 ? `min ${formatPln(min)}` : HINTS[c] ?? ""}
                </Text>
              </View>
              <AmountStepper compact value={draft[c]} onChange={(v) => setDraft((d) => ({ ...d, [c]: v }))} />
            </View>
          );
        })}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 4, ...shadow1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryTotal: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 6, marginTop: 4 },
  summaryLabel: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, fontVariant: ["tabular-nums"] },
  bold: { fontFamily: font.extrabold, color: colors.ink, fontSize: 15 },
  tip: { fontFamily: font.semibold, fontSize: 13, color: colors.danger, marginTop: 4 },
  list: { gap: 10 },
  row: { backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 8, borderWidth: 1.5, borderColor: colors.line },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rowLabel: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  rowHint: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
});
