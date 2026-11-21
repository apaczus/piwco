// Game screen in phase "play": two pages, LEARN (the month's game screen) and CITY, switched by a horizontal swipe
// or the "Learn · City" switch on top. Built on a paging ScrollView: the vertical scroll inside LEARN keeps working,
// iOS gives a rubber band at the edges, and the switch indicator follows the finger (native-driver scroll event).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from "react-native";
import { buzz, useMountSpring } from "../onboarding/anim";
import { colors, font, shadow1, springs } from "../theme";

const PAGES = ["Learn", "City"] as const;

function Badge({ count }: { count: number }) {
  const pop = useMountSpring(springs.lively);
  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: pop }] }]}>
      <Text style={styles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

export function GamePager({
  learn,
  city,
  cityBadge = 0,
  badgeFrom = 0,
  onPage,
}: {
  learn: ReactNode;
  city: ReactNode;
  // Buildings waiting to be upgraded (shown on the "City" segment; hidden at 0).
  cityBadge?: number;
  // Badge value the player saw last; a higher one gets a haptic tick once the screen is in.
  badgeFrom?: number;
  onPage?: (page: 0 | 1) => void;
}) {
  const [width, setWidth] = useState(0);
  const [switchWidth, setSwitchWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scroller = useRef<ScrollViewInstance>(null);
  const page = useRef<0 | 1>(0);

  useEffect(() => {
    if (cityBadge <= badgeFrom) return;
    const t = setTimeout(() => buzz("tick"), 350);
    return () => clearTimeout(t);
    // Only when the screen mounts (after an action screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPage = (p: 0 | 1) => {
    if (p === page.current) return;
    page.current = p;
    buzz("tick");
    onPage?.(p);
  };

  const segment = switchWidth > 0 ? (switchWidth - 8) / 2 : 0;
  const indicatorX =
    width > 0
      ? scrollX.interpolate({ inputRange: [0, width], outputRange: [0, segment], extrapolate: "clamp" })
      : 0;

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.switchRow}>
        <View style={styles.switch} onLayout={(e) => setSwitchWidth(e.nativeEvent.layout.width)}>
          {segment > 0 ? (
            <Animated.View style={[styles.indicator, { width: segment, transform: [{ translateX: indicatorX }] }]} />
          ) : null}
          {PAGES.map((label, i) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={label}
              style={styles.segment}
              onPress={() => {
                scroller.current?.scrollTo({ x: i * width, animated: true });
                setPage(i as 0 | 1);
              }}
            >
              <Text style={styles.segmentText}>{label}</Text>
              {i === 1 && cityBadge > 0 ? <Badge key={cityBadge} count={cityBadge} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
      {width > 0 ? (
        <Animated.ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          bounces
          overScrollMode="always"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width) === 1 ? 1 : 0)}
          style={{ flex: 1 }}
        >
          <View style={[styles.page, { width }]}>{learn}</View>
          <View style={[styles.page, { width }]}>{city}</View>
        </Animated.ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edges (the game container has 18 px side padding); pages add it back.
  wrap: { flex: 1, marginHorizontal: -18 },
  switchRow: { paddingHorizontal: 18, paddingBottom: 6, alignItems: "center" },
  switch: {
    flexDirection: "row",
    width: 220,
    padding: 4,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadow1,
  },
  indicator: { position: "absolute", left: 4, top: 4, bottom: 4, borderRadius: 99, backgroundColor: colors.yellow },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  segmentText: { fontFamily: font.extrabold, fontSize: 14, letterSpacing: 0.3, color: colors.petrol950 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: font.extrabold, fontSize: 11.5, color: colors.surface },
  page: { flex: 1, paddingHorizontal: 18 },
});
