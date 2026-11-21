// HUD (top right): one card for the company and one for the home. Big balance now, revenue/costs or bills,
// and "at month end" from the same settlement the engine runs on "End month" (green ✓ / red ✗).
import { settleMonth, type GameState } from "@piwco/engine";
import { StyleSheet, Text, View } from "react-native";
import { accountColors, colors, font, shadow1 } from "../theme";
import { formatPln } from "./format";

function AccountCard({
  title,
  color,
  cash,
  detail,
  endOk,
  endText,
  extra,
}: {
  title: string;
  color: string;
  cash: number;
  detail: string;
  endOk: boolean;
  endText: string;
  extra?: string;
}) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.cash} numberOfLines={1} adjustsFontSizeToFit>
        {formatPln(cash)}
      </Text>
      <Text style={styles.detail} numberOfLines={1} adjustsFontSizeToFit>
        {detail}
      </Text>
      <View style={[styles.end, { backgroundColor: endOk ? "#E4F4EF" : colors.dangerBg }]}>
        <Text style={[styles.endText, { color: endOk ? colors.success : colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
          {endText}
        </Text>
      </View>
      {extra ? <Text style={styles.extra}>{extra}</Text> : null}
    </View>
  );
}

const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

export function GameHud({ state }: { state: GameState }) {
  const b = state.business;
  const p = state.personal;
  const { report } = settleMonth(state);
  const costs = report.business.costs;
  const bills = report.personal.bills.reduce((s, x) => s + x.budgeted, 0) + report.personal.installmentDue;
  const bizOk = report.business.arrearsAdded === 0;
  const homeOk = report.personal.arrearsAdded === 0;

  const bizExtra = b.arrears > 0 ? `Arrears ${formatPln(b.arrears)}` : undefined;
  const homeExtra = [
    p.arrears > 0 ? `Arrears ${formatPln(p.arrears)}` : null,
    p.emergencyFund > 0 ? `Cushion ${formatPln(p.emergencyFund)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.wrap}>
      <AccountCard
        title="COMPANY"
        color={colors.petrol700}
        cash={b.cash}
        detail={`+${short(b.monthlyRevenue)} revenue · −${short(costs)} costs`}
        endOk={bizOk}
        endText={
          bizOk
            ? `Month end: ${formatPln(report.business.endCash)} ✓`
            : `${formatPln(report.business.arrearsAdded)} unpaid ✗`
        }
        extra={bizExtra}
      />
      <AccountCard
        title="HOME"
        color={accountColors.main.color}
        cash={p.cash}
        detail={`−${short(bills)} bills this month`}
        endOk={homeOk}
        endText={
          homeOk
            ? `Month end: ${formatPln(report.personal.endCash)} ✓`
            : `${formatPln(report.personal.arrearsAdded)} unpaid ✗`
        }
        extra={homeExtra || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 9,
    paddingHorizontal: 11,
    gap: 2,
    ...shadow1,
  },
  title: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.muted },
  cash: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 27, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  detail: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  end: { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7, marginTop: 4 },
  endText: { fontFamily: font.extrabold, fontSize: 12.5 },
  extra: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted, marginTop: 2 },
});
