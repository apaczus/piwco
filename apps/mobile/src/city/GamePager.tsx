// Game screen: three pages, YEAR (the year map, left), LEARN (the month's game screen, the "home" page in the
// middle, shown first) and CITY (right), switched by a horizontal swipe or the "Year · Learn · City" switch on top.
// The side pages get a "back to the month" button through PagerContext. Built on a paging ScrollView: the vertical scroll inside LEARN keeps working,
// iOS gives a rubber band at the edges, and the switch indicator follows the finger (native-driver scroll event).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from "react-native";
import { buzz, useMountSpring } from "../onboarding/anim";
import { colors, font, shadow1, springs } from "../theme";
import { CoachTarget } from "../game/coach";

const PAGES = ["Year", "Learn", "City"] as const;
export type PagerPage = 0 | 1 | 2;
export const LEARN_PAGE: PagerPage = 1;
export const CITY_PAGE: PagerPage = 2;

// Lets a page scroll the pager (e.g. "Back to the month" on YEAR / CITY).
const PagerContext = createContext<{ goTo: (p: PagerPage) => void } | null>(null);
export function usePager() {
  return useContext(PagerContext);
}

function Badge({ count }: { count: number }) {
  const pop = useMountSpring(springs.lively);
  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: pop }] }]}>
      <Text style={styles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

export function GamePager({
  year,
  learn,
  city,
  cityBadge = 0,
  badgeFrom = 0,
  onPage,
  controlRef,
}: {
  // Lets the owner scroll the pager (the guided tour shows YEAR and CITY).
  controlRef?: { current: { goTo: (p: PagerPage) => void } | null };
  year: ReactNode;
  learn: ReactNode;
  city: ReactNode;
  // Buildings waiting to be upgraded (shown on the "City" segment; hidden at 0).
  cityBadge?: number;
  // Badge value the player saw last; a higher one gets a haptic tick once the screen is in.
  badgeFrom?: number;
  onPage?: (page: PagerPage) => void;
}) {
  const [width, setWidth] = useState(0);
  const [switchWidth, setSwitchWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scroller = useRef<ScrollViewInstance>(null);
  const page = useRef<PagerPage>(LEARN_PAGE);
  // Start on LEARN (the middle page) without an animation once the width is known.
  useEffect(() => {
    if (width <= 0) return;
    scrollX.setValue(LEARN_PAGE * width);
    const t = setTimeout(() => scroller.current?.scrollTo({ x: page.current * width, animated: false }), 0);
    return () => clearTimeout(t);
  }, [width, scrollX]);

  useEffect(() => {
    if (cityBadge <= badgeFrom) return;
    const t = setTimeout(() => buzz("tick"), 350);
    return () => clearTimeout(t);
    // Only when the screen mounts (after an action screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPage = (p: PagerPage) => {
    if (p === page.current) return;
    page.current = p;
    buzz("tick");
    onPage?.(p);
  };

  const goTo = (p: PagerPage) => {
    scroller.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };
  if (controlRef) controlRef.current = { goTo };

  const segment = switchWidth > 0 ? (switchWidth - 8) / PAGES.length : 0;
  const indicatorX =
    width > 0
      ? scrollX.interpolate({ inputRange: [0, 2 * width], outputRange: [0, 2 * segment], extrapolate: "clamp" })
      : 0;

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.switchRow}>
        <CoachTarget id="pager">
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
              onPress={() => goTo(i as PagerPage)}
            >
              <Text style={styles.segmentText}>{label}</Text>
              {i === CITY_PAGE && cityBadge > 0 ? <Badge key={cityBadge} count={cityBadge} /> : null}
            </Pressable>
          ))}
        </View>
        </CoachTarget>
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
          contentOffset={{ x: LEARN_PAGE * width, y: 0 }}
          onMomentumScrollEnd={(e) => setPage(Math.max(0, Math.min(2, Math.round(e.nativeEvent.contentOffset.x / width))) as PagerPage)}
          style={{ flex: 1 }}
        >
          <PagerContext.Provider value={{ goTo }}>
            <View style={[styles.page, { width }]}>{year}</View>
            <View style={[styles.page, { width }]}>{learn}</View>
            <View style={[styles.page, { width }]}>{city}</View>
          </PagerContext.Provider>
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
    width: 276,
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
