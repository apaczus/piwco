// Month start card: "Month 1 · January", topic and the challenge from the learning program.
import type { Level } from "@piwco/content";
import { StyleSheet, Text, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, InGamePanel, Sub, Title } from "../onboarding/ui";
import { colors, font } from "../theme";

export function MonthIntro({ level, dir, onStart }: { level: Level; dir: Dir; onStart: () => void }) {
  return (
    <ScreenLayout dir={dir} footer={<Cta label="Start the month" onPress={onStart} />}>
      <Eyebrow>{`Month ${level.month} · ${level.monthName}`}</Eyebrow>
      <Title>{level.title}</Title>
      <Sub>{level.subtitle}</Sub>
      <InGamePanel label="Your challenge" text={level.challenge} />
      <View style={styles.topics}>
        <Text style={styles.topicsTitle}>THIS MONTH YOU'LL LEARN</Text>
        {level.topics.map((t) => (
          <View key={t} style={styles.topic}>
            <View style={styles.bullet} />
            <Text style={styles.topicText}>{t}</Text>
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topics: { gap: 8 },
  topicsTitle: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.muted },
  topic: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: {
    width: 7,
    height: 7,
    marginTop: 7,
    backgroundColor: colors.yellow,
    transform: [{ rotate: "45deg" }],
  },
  topicText: { flex: 1, fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
});
