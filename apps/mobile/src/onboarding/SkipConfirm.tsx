// "Skip to game ›" asks first (user, 2026-11-22: kept for the jury, but confirm and say it uses demo data).
// A plain overlay inside the screen (not Alert / Modal), so it works the same on phones and on the web.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, shadow2, springs } from "../theme";
import { buzz, Enter, PressScale } from "./anim";
import { Cta } from "./ui";

export function SkipConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onCancel} accessibilityLabel="Cancel" />
      <View style={styles.bottom} pointerEvents="box-none">
        <Enter from="below" distance={40} spring={springs.snappy}>
          <View style={styles.card}>
            <Text style={styles.small}>SKIP THE SURVEY?</Text>
            <Text style={styles.title}>Start with demo data</Text>
            <Text style={styles.text}>
              We'll skip your answers and use a demo player: a small restaurant owner who knows the basics, so the game
              starts with investing and credit. Your own answers would change your starting money and your path.
            </Text>
            <Cta
              label="Yes, start with demo data"
              onPress={() => {
                buzz("light");
                onConfirm();
              }}
            />
            <PressScale onPress={onCancel} style={styles.secondary} accessibilityLabel="Back to the survey">
              <Text style={styles.secondaryText}>Back to the survey</Text>
            </PressScale>
          </View>
        </Enter>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,20,25,0.55)" },
  bottom: { flex: 1, justifyContent: "flex-end", padding: 14, paddingBottom: 28 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 12, ...shadow2 },
  small: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 1, color: colors.petrol700 },
  title: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 27, color: colors.petrol950 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  secondary: { alignItems: "center", paddingVertical: 10 },
  secondaryText: { fontFamily: font.bold, fontSize: 15, color: colors.petrol700 },
});
