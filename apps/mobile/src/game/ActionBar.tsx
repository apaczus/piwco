// Collapsible action bar (left). More actions unlock with each month.
import { levels } from "@piwco/content";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { buzz, Enter, PressScale } from "../onboarding/anim";
import { colors, font, mix, shadow1, shadow2 } from "../theme";

export type ActionId = "draw" | "budget" | "cushion" | "insurance";

type ActionDef = { id: ActionId; label: string; hint: string; unlockMonth: number; icon: (color: string) => ReactNode };

// Short labels shown under the icons in the collapsed rail.
const SHORT: Record<ActionId, string> = { draw: "Pay", budget: "Budget", cushion: "Save", insurance: "Insure" };

const ACTIONS: ActionDef[] = [
  {
    id: "draw",
    label: "Pay yourself",
    hint: "Company → personal account",
    unlockMonth: 1,
    icon: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M3 10l2-5h14l2 5M4 10v9h16v-9" fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M12 12v5M9.5 14.5L12 17l2.5-2.5" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    id: "budget",
    label: "Household budget",
    hint: "Plan your home's spending",
    unlockMonth: 1,
    icon: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Rect x={4} y={3} width={16} height={18} rx={3} fill="none" stroke={c} strokeWidth={2} />
        <Path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    id: "cushion",
    label: "Save to cushion",
    hint: "Personal account → emergency fund",
    unlockMonth: 2,
    icon: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M4 9c0-2 2-3 8-3s8 1 8 3v6c0 2-2 3-8 3s-8-1-8-3z" fill="none" stroke={c} strokeWidth={2} />
        <Path d="M8 12h8" stroke={c} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    id: "insurance",
    label: "Insurance",
    hint: "Protect against big losses",
    unlockMonth: 3,
    icon: (c) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={12} cy={11} r={2} fill={c} />
      </Svg>
    ),
  },
];

const monthName = (m: number) => levels.find((l) => l.month === m)?.monthName ?? `month ${m}`;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d={open ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        fill="none"
        stroke={colors.petrol900}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ActionBar({ month, onAction }: { month: number; onAction: (id: ActionId) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    buzz("tick");
    setOpen((o) => !o);
  };
  const pick = (a: ActionDef) => {
    if (a.unlockMonth > month) return;
    buzz("tick");
    setOpen(false);
    onAction(a.id);
  };

  return (
    <View style={styles.wrap}>
      {/* Collapsed rail: one icon button per action. */}
      <View style={styles.rail}>
        <PressScale onPress={toggle} accessibilityLabel={open ? "Hide actions" : "Show actions"} style={styles.railButton}>
          <ChevronIcon open={open} />
        </PressScale>
        {ACTIONS.map((a) => {
          const locked = a.unlockMonth > month;
          return (
            <PressScale
              key={a.id}
              onPress={() => (locked ? toggle() : pick(a))}
              accessibilityLabel={a.label}
              style={[styles.railButton, styles.railLabeled, locked ? styles.locked : styles.railAction]}
            >
              {a.icon(locked ? colors.muted : colors.petrol800)}
              <Text style={[styles.railText, locked ? { color: colors.muted } : null]}>{SHORT[a.id]}</Text>
            </PressScale>
          );
        })}
      </View>

      {/* Expanded panel with labels, over the HUD. */}
      {open ? (
        <Enter from="left" distance={16} style={styles.panel}>
          <Text style={styles.panelTitle}>ACTIONS</Text>
          {ACTIONS.map((a) => {
            const locked = a.unlockMonth > month;
            return (
              <PressScale
                key={a.id}
                onPress={() => pick(a)}
                disabled={locked}
                accessibilityLabel={a.label}
                style={[styles.item, locked ? styles.locked : null]}
              >
                <View style={[styles.itemIcon, { backgroundColor: locked ? colors.surface2 : colors.petrol100 }]}>
                  {a.icon(locked ? colors.muted : colors.petrol800)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>{a.label}</Text>
                  <Text style={styles.itemHint}>{locked ? `Unlocks in ${monthName(a.unlockMonth)}` : a.hint}</Text>
                </View>
              </PressScale>
            );
          })}
        </Enter>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },
  rail: { gap: 8 },
  railButton: {
    width: 56,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow1,
  },
  railAction: { backgroundColor: mix(colors.petrol100, colors.surface, 60) },
  railLabeled: { width: 56, height: 58, gap: 2 },
  railText: { fontFamily: font.extrabold, fontSize: 10, color: colors.petrol800 },
  locked: { opacity: 0.5 },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    gap: 8,
    ...shadow2,
  },
  panelTitle: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.muted, marginLeft: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemLabel: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  itemHint: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
});
