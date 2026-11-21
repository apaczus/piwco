// Card that slides up when a completed month on the year map is tapped: "Review" or "Replay month".
// Replaying asks first, because time goes back to that month's start and later months start over.
import type { Level } from "@piwco/content";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, Enter, PressScale } from "../onboarding/anim";
import { Cta } from "../onboarding/ui";
import { colors, font, shadow2, springs } from "../theme";

export function MonthSheet({
  level,
  laterMonths,
  onReview,
  onReplay,
  onClose,
}: {
  level: Level;
  // Completed months after this one (they will have to be played again).
  laterMonths: number;
  onReview: () => void;
  onReplay: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.bottom} pointerEvents="box-none">
        <Enter key={confirm ? "confirm" : "menu"} from="below" distance={40} spring={springs.snappy}>
          <View style={styles.card}>
            <Text style={styles.small}>{`MONTH ${level.month} · DONE ✓`}</Text>
            <Text style={styles.title}>{`${level.monthName}: ${level.title}`}</Text>
            {confirm ? (
              <>
                <Text style={styles.text}>
                  {`You'll replay ${level.monthName} from its start, with the same starting point.` +
                    (laterMonths > 0 ? ` The ${laterMonths} month${laterMonths === 1 ? "" : "s"} after it start over.` : " Your city goes back to how it was then.")}
                </Text>
                <Cta
                  label={`Replay ${level.monthName}`}
                  onPress={() => {
                    buzz("medium", "whoosh");
                    onReplay();
                  }}
                />
                <PressScale onPress={() => setConfirm(false)} style={styles.secondary} accessibilityLabel="Cancel">
                  <Text style={styles.secondaryText}>Cancel</Text>
                </PressScale>
              </>
            ) : (
              <>
                <Text style={styles.text}>Look back at how it went, or play it again and try other decisions.</Text>
                <PressScale
                  onPress={() => {
                    buzz("light");
                    onReview();
                  }}
                  style={styles.option}
                  accessibilityLabel="Review"
                >
                  <Text style={styles.optionTitle}>Review</Text>
                  <Text style={styles.optionText}>Receipt, result, lesson and city of your pass</Text>
                </PressScale>
                <PressScale
                  onPress={() => {
                    buzz("tick");
                    setConfirm(true);
                  }}
                  style={styles.option}
                  accessibilityLabel="Replay month"
                >
                  <Text style={styles.optionTitle}>Replay month</Text>
                  <Text style={styles.optionText}>Go back in time to the start of the month</Text>
                </PressScale>
                <PressScale onPress={onClose} style={styles.secondary} accessibilityLabel="Close">
                  <Text style={styles.secondaryText}>Close</Text>
                </PressScale>
              </>
            )}
          </View>
        </Enter>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,20,25,0.55)" },
  bottom: { flex: 1, justifyContent: "flex-end", padding: 14, paddingBottom: 28 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 12, ...shadow2 },
  small: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 1, color: colors.success },
  title: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 27, color: colors.petrol950 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  option: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, padding: 14, gap: 2 },
  optionTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.petrol900 },
  optionText: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted },
  secondary: { alignItems: "center", paddingVertical: 10 },
  secondaryText: { fontFamily: font.bold, fontSize: 15, color: colors.petrol700 },
});
