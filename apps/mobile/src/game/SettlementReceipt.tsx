// "End month" -> a receipt of the settlement: lines drop in one by one (~1.5 s), totals roll, then a stamp
// (ALL BILLS PAID ✓ / UNPAID BILLS ✗) and "See result". Tap anywhere to show everything at once.
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { buzz, Enter, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Title } from "../onboarding/ui";
import { colors, font, mix, shadow2, springs } from "../theme";
import { formatPln } from "./format";
import type { Receipt, ReceiptLine } from "./receipt";
import { RollingNumber } from "./RollingNumber";

const STEP_MS = 110;

function Line({ line }: { line: ReceiptLine }) {
  const total = line.sign === "=";
  const bad = line.status === "bad";
  return (
    <Enter from="below" distance={10} spring={springs.snappy}>
      <View style={[styles.line, total ? styles.totalLine : null]}>
        <Text style={[styles.sign, total ? styles.totalText : null]}>{line.sign}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, total ? styles.totalText : null, bad ? { color: colors.danger } : null]}>{line.label}</Text>
          {line.note ? <Text style={styles.note}>{line.note}</Text> : null}
        </View>
        {total ? (
          <RollingNumber value={line.amount} from={0} duration={500} style={[styles.amount, styles.totalText]} />
        ) : (
          <Text style={[styles.amount, bad ? { color: colors.danger } : null]}>{formatPln(line.amount)}</Text>
        )}
        <Text style={[styles.mark, { color: bad ? colors.danger : colors.success }]}>
          {line.status === "ok" ? "✓" : bad ? "✗" : " "}
        </Text>
      </View>
    </Enter>
  );
}

// Torn-paper bottom edge.
function Zigzag() {
  const teeth = 24;
  const d =
    "M0 0 " +
    Array.from({ length: teeth }, (_, i) => `L${(i + 0.5) * (100 / teeth)} 8 L${(i + 1) * (100 / teeth)} 0`).join(" ") +
    " Z";
  return (
    <Svg width="100%" height={9} viewBox="0 0 100 9" preserveAspectRatio="none">
      <Path d={d} fill={colors.surface} />
    </Svg>
  );
}

function Stamp({ ok, reduced }: { ok: boolean; reduced: boolean }) {
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    buzz(ok ? "success" : "medium", ok ? "success" : "error");
    if (reduced) return;
    const a = Animated.sequence([
      Animated.spring(v, { toValue: 1, stiffness: 260, damping: 13, mass: 1, useNativeDriver: true }),
      ...(ok ? [] : [6, -5, 4, -2, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: true }))),
    ]);
    a.start();
    return () => a.stop();
  }, [ok, reduced, v, shake]);
  const tint = ok ? colors.success : colors.danger;
  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          borderColor: tint,
          backgroundColor: mix(tint, colors.surface, 8),
          opacity: v.interpolate({ inputRange: [0, 0.2], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateX: shake },
            { rotate: "-4deg" },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] }) },
          ],
        },
      ]}
    >
      <Text style={[styles.stampText, { color: tint }]}>{ok ? "ALL BILLS PAID ✓" : "UNPAID BILLS ✗"}</Text>
    </Animated.View>
  );
}

export function SettlementReceipt({
  receipt,
  monthName,
  dir,
  onContinue,
}: {
  receipt: Receipt;
  monthName: string;
  dir: Dir;
  onContinue: () => void;
}) {
  const reduced = useReducedMotion();
  const total = receipt.company.length + receipt.home.length;
  const [shown, setShown] = useState(0);
  const done = shown >= total;
  const skipped = useRef(false);
  const showAll = () => {
    skipped.current = true;
    setShown(total);
  };

  useEffect(() => {
    if (reduced) {
      setShown(total);
      return;
    }
    // Starts after the screen has slid in.
    let n = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        if (skipped.current) {
          if (timer) clearInterval(timer);
          return;
        }
        n += 1;
        setShown((s) => Math.max(s, n));
        buzz("tick");
        if (n >= total && timer) clearInterval(timer);
      }, STEP_MS);
    }, 250);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [reduced, total]);

  const companyShown = receipt.company.slice(0, shown);
  const homeShown = receipt.home.slice(0, Math.max(0, shown - receipt.company.length));

  return (
    <ScreenLayout
      dir={dir}
      footer={
        done ? (
          <Cta appear label="See result" onPress={onContinue} />
        ) : (
          <Pressable onPress={showAll} style={styles.skip}>
            <Text style={styles.skipText}>Tap to show everything</Text>
          </Pressable>
        )
      }
    >
      <Eyebrow>{`${monthName} · month end`}</Eyebrow>
      <Title>Where your money went</Title>
      <Pressable onPress={showAll} disabled={done}>
        <View style={styles.paperShadow}>
          <View style={styles.paper}>
            <Text style={styles.section}>COMPANY</Text>
            {companyShown.map((l) => (
              <Line key={l.id} line={l} />
            ))}
            {shown > receipt.company.length ? (
              <>
                <View style={styles.dashed} />
                <Text style={styles.section}>HOME</Text>
              </>
            ) : null}
            {homeShown.map((l) => (
              <Line key={l.id} line={l} />
            ))}
            <View style={styles.stampSlot}>{done ? <Stamp ok={receipt.allPaid} reduced={reduced} /> : null}</View>
          </View>
          <Zigzag />
        </View>
      </Pressable>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  paperShadow: { ...shadow2, borderRadius: 16 },
  paper: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 2,
  },
  section: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 1.2, color: colors.petrol700, marginBottom: 4 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 5 },
  totalLine: { borderTopWidth: 1.5, borderTopColor: colors.line, marginTop: 4, paddingTop: 8 },
  sign: { width: 14, fontFamily: font.extrabold, fontSize: 15, color: colors.muted, lineHeight: 21 },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, lineHeight: 21 },
  note: { fontFamily: font.bold, fontSize: 12.5, color: colors.danger },
  amount: { fontFamily: font.bold, fontSize: 15, color: colors.ink, lineHeight: 21, fontVariant: ["tabular-nums"] },
  totalText: { fontFamily: font.extrabold, color: colors.petrol950, fontSize: 16 },
  mark: { width: 16, fontFamily: font.extrabold, fontSize: 15, lineHeight: 21, textAlign: "right" },
  dashed: { borderTopWidth: 1.5, borderStyle: "dashed", borderTopColor: colors.line, marginVertical: 10 },
  stampSlot: { minHeight: 64, alignItems: "center", justifyContent: "center", marginTop: 6 },
  stamp: { borderWidth: 3, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  stampText: { fontFamily: font.extrabold, fontSize: 18, letterSpacing: 1.4 },
  skip: { height: 58, alignItems: "center", justifyContent: "center" },
  skipText: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
});
