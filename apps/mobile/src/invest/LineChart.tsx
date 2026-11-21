// The investing chapter's line chart (the only new visual element): flat lines in theme colours, no grid and no
// shadows, like the onboarding illustrations. One faint reference line at the start amount. Labels are RN Text
// laid over the drawing (never react-native-svg Text).
import { memo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { DrawPath, useReducedMotion } from "../onboarding/anim";
import { colors, font } from "../theme";
import { formatPln } from "../game/format";

export type ChartSeries = {
  key: string;
  values: number[];
  color: string;
  // Stroke width (the player's portfolio is thick, comparisons thin).
  width?: number;
  dashed?: boolean;
};

const PAD_Y = 10;

export const LineChart = memo(function LineChart({
  series,
  height = 170,
  reveal,
  baseline,
  draw,
  startLabel,
  endLabel,
}: {
  series: ChartSeries[];
  height?: number;
  // Points shown (fast-forward: grows month by month); all when missing.
  reveal?: number;
  // Faint reference line (e.g. the 10 000 PLN put in).
  baseline?: number;
  // Lines draw themselves on mount (summary screens).
  draw?: boolean;
  startLabel?: string;
  endLabel?: string;
}) {
  const [w, setW] = useState(0);
  // Reduced motion: summary lines appear at once instead of drawing themselves.
  const reduced = useReducedMotion();
  const n = Math.max(...series.map((s) => s.values.length));
  // The scale uses all values (not only the revealed ones), so the chart doesn't jump while it grows.
  const all = series.flatMap((s) => s.values).concat(baseline !== undefined ? [baseline] : []);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = Math.max(1, hi - lo);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * w : 0);
  const y = (v: number) => PAD_Y + (1 - (v - lo) / span) * (height - 2 * PAD_Y);
  const pathOf = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const length = (w + height) * 2.5;

  return (
    <View>
      <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            {baseline !== undefined ? (
              <Line x1={0} x2={w} y1={y(baseline)} y2={y(baseline)} stroke={colors.line} strokeWidth={1.5} strokeDasharray={[4, 5]} />
            ) : null}
            {series.map((s) => {
              const vals = reveal === undefined ? s.values : s.values.slice(0, Math.max(1, reveal + 1));
              const common = {
                d: pathOf(vals),
                stroke: s.color,
                strokeWidth: s.width ?? 2,
                strokeLinecap: "round" as const,
                strokeLinejoin: "round" as const,
                fill: "none",
              };
              if (s.dashed) return <Path key={s.key} {...common} strokeDasharray={[6, 6]} />;
              return draw && !reduced ? <DrawPath key={s.key} {...common} length={length} duration={1100} /> : <Path key={s.key} {...common} />;
            })}
          </Svg>
        ) : null}
        {baseline !== undefined && w > 0 ? (
          <Text style={[styles.baseLabel, { top: Math.max(0, y(baseline) - 18) }]}>{formatPln(baseline)}</Text>
        ) : null}
      </View>
      {startLabel || endLabel ? (
        <View style={styles.axis}>
          <Text style={styles.axisText}>{startLabel ?? ""}</Text>
          <Text style={styles.axisText}>{endLabel ?? ""}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  baseLabel: { position: "absolute", left: 0, fontFamily: font.semibold, fontSize: 11, color: colors.muted, fontVariant: ["tabular-nums"] },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted },
});
