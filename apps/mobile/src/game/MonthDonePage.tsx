// LEARN page between months (phase "hub"): the completed month, what comes next, and the city behind.
// When the next month is playable (step 33) this becomes its start.
import type { Level } from "@piwco/content";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Enter } from "../onboarding/anim";
import { Cta, Eyebrow, LinkButton, Sub, Title } from "../onboarding/ui";
import { colors, font, shadow2 } from "../theme";
import { SwipeHint } from "./SwipeHint";

export function MonthDonePage({
  level,
  next,
  backdrop,
  onYear,
  onPlayBasics,
}: {
  // After the investing chapter, a player who skipped the basics can still play January.
  onPlayBasics?: () => void;
  level: Level;
  next: Level | undefined;
  backdrop: ReactNode;
  onYear: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View pointerEvents="none" style={styles.backdrop}>
        {backdrop}
      </View>
      <ScrollView style={{ flex: 1, marginHorizontal: -18 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Eyebrow color={colors.success}>{`${level.monthName} · complete`}</Eyebrow>
        <Title>{`${level.monthName} done ✓`}</Title>
        <Enter from="below" delay={80}>
          <View style={styles.card}>
            <Text style={styles.small}>NEXT</Text>
            <Text style={styles.next}>{next ? `${next.monthName}: ${next.title}` : "That's the whole year!"}</Text>
            {next ? <Sub>{`${next.subtitle}. Coming soon.`}</Sub> : null}
          </View>
        </Enter>
        <SwipeHint />
      </ScrollView>
      {onPlayBasics ? (
        <View style={{ gap: 4 }}>
          <Cta label="Play the basics anyway ›" onPress={onPlayBasics} />
          <LinkButton label="See your year" onPress={onYear} />
        </View>
      ) : (
        <Cta label="See your year ›" onPress={onYear} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: -18, right: -18, bottom: 70, opacity: 0.16 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 6, ...shadow2 },
  small: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  next: { fontFamily: font.extrabold, fontSize: 19, lineHeight: 25, color: colors.petrol950 },
});
