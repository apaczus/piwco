// "Pay yourself": move money from the company account to the personal account.
import { applyAction, settleMonth, type GameState } from "@piwco/engine";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, LinkButton, Title, Why } from "../onboarding/ui";
import { accountColors, colors, font, shadow1 } from "../theme";
import { AmountStepper } from "./AmountStepper";
import { formatPln } from "./format";

function AccountCard({ title, color, now, after, endOfMonth }: { title: string; color: string; now: number; after: number; endOfMonth: number }) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardNow}>{formatPln(after)}</Text>
      <Text style={styles.cardSub}>{`now ${formatPln(now)}`}</Text>
      <Text style={[styles.cardSub, endOfMonth < 0 ? { color: colors.danger } : null]}>
        {`end of month: ${formatPln(endOfMonth)}`}
      </Text>
    </View>
  );
}

export function DrawSheet({
  state,
  dir,
  onConfirm,
  onCancel,
}: {
  state: GameState;
  dir: Dir;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(0);
  // Preview with the engine itself: what each account looks like after this transfer and at month end.
  const preview = amount > 0 ? applyAction(state, { type: "owner_draw", amount }) : null;
  const after = preview && preview.ok ? preview.state : state;
  const { report } = settleMonth(after);
  const companyUnpaid = report.business.arrearsAdded;

  return (
    <ScreenLayout
      dir={dir}
      footer={
        <>
          {amount > 0 ? (
            <Cta label={`Transfer ${formatPln(amount)}`} onPress={() => onConfirm(amount)} />
          ) : (
            <View style={{ height: 58 }} />
          )}
          <LinkButton label="Cancel" onPress={onCancel} />
        </>
      }
    >
      <Eyebrow>Pay yourself</Eyebrow>
      <Title>How much do you move from the company to your personal account?</Title>
      <Why>
        The company has to pay salaries, rent and suppliers at the end of the month. Your home needs money too. Take
        too much and the company can't pay its bills; too little and your home can't.
      </Why>
      <View style={styles.cards}>
        <AccountCard
          title="Company"
          color={colors.petrol700}
          now={state.business.cash}
          after={after.business.cash}
          endOfMonth={report.business.endCash - companyUnpaid}
        />
        <AccountCard
          title="Home"
          color={accountColors.main.color}
          now={state.personal.cash}
          after={after.personal.cash}
          endOfMonth={report.personal.endCash - report.personal.arrearsAdded}
        />
      </View>
      <AmountStepper value={amount} onChange={setAmount} max={state.business.cash} />
      {companyUnpaid > 0 ? (
        <Text style={styles.warn}>{`With this transfer the company can't pay ${formatPln(companyUnpaid)} of its costs.`}</Text>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  cards: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderTopWidth: 4,
    padding: 12,
    gap: 2,
    ...shadow1,
  },
  cardTitle: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.8, color: colors.muted },
  cardNow: { fontFamily: font.extrabold, fontSize: 19, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  cardSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  warn: { fontFamily: font.bold, fontSize: 14, color: colors.danger, textAlign: "center" },
});
