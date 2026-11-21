// The 4 welcome-slide illustrations, ported from the artifact's SVGs.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { font } from "../theme";
import { DrawPath, Enter, PopG } from "./anim";

// Delays from the artifact: lines draw at 200 + i*160 ms, groups pop at 250 + i*110 ms.
const draw = (i: number) => 200 + i * 160;
const pop = (i: number) => 250 + i * 110;

function Art1() {
  return (
    <Svg width="88%" height="88%" viewBox="0 0 300 240">
      <DrawPath length={200} delay={draw(0)} d="M36 196 C 106 196, 118 128, 150 118" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={9} strokeLinecap="round" />
      <DrawPath length={160} delay={draw(1)} d="M150 118 C 190 104, 212 62, 262 54" fill="none" stroke="#22A088" strokeWidth={9} strokeLinecap="round" />
      <DrawPath length={160} delay={draw(2)} d="M150 118 C 190 132, 214 172, 262 182" fill="none" stroke="#FFD400" strokeWidth={9} strokeLinecap="round" />
      <PopG delay={pop(0)}>
        <Circle cx={150} cy={118} r={17} fill="#003A44" stroke="#fff" strokeWidth={5} />
      </PopG>
      <PopG delay={pop(1)}>
        <Circle cx={36} cy={196} r={9} fill="#fff" />
      </PopG>
      <PopG delay={pop(2)}>
        <Rect x={238} y={30} width={48} height={48} rx={14} fill="#22A088" opacity={0.22} />
        <Path d="M251 55l8 8 13-16" fill="none" stroke="#5FD3BC" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </PopG>
      <PopG delay={pop(3)}>
        <Rect x={238} y={158} width={48} height={48} rx={14} fill="#FFD400" opacity={0.2} />
        <Path d="M262 170v15M262 194v2" stroke="#FFD400" strokeWidth={5} strokeLinecap="round" />
      </PopG>
    </Svg>
  );
}

function Card({ y, fill, stroke }: { y: number; fill: string; stroke?: string }) {
  return <Rect x={22} y={y} width={256} height={54} rx={14} fill={fill} stroke={stroke} />;
}

// Card labels are normal app text laid over the drawing: react-native-svg's text rendered Manrope with filled
// counters (b, d, e) on phones (user report). Positions are in the drawing's 300×240 units.
const LABELS: { x: number; y: number; title: string; text: string; dark?: boolean; delay: number }[] = [
  { x: 76, y: 44, title: "Problem", text: "Your car broke down", delay: pop(0) },
  { x: 76, y: 122, title: "Your decision", text: "Cushion, loan or wait?", delay: pop(1) },
  { x: 76, y: 200, title: "Effect and lesson", text: "See what your decision changed", dark: true, delay: pop(2) },
];

function Art2Labels() {
  const [w, setW] = useState(0);
  const u = w / 300;
  return (
    <View pointerEvents="none" style={styles.labels} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0
        ? LABELS.map((l) => (
            // Baselines in the drawing: title at y, text 17 units lower; the text box starts ~12 units above.
            <View key={l.title} style={{ position: "absolute", left: l.x * u, top: (l.y - 13) * u, right: 8 * u }}>
              <Enter delay={l.delay} from="below" distance={4}>
                <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 13 * u, lineHeight: 17 * u, color: l.dark ? "#003A44" : "#FFFFFF" }}>
                  {l.title}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 11.5 * u, lineHeight: 15.5 * u, color: l.dark ? "#0B5E6B" : "#A9C7CC" }}>
                  {l.text}
                </Text>
              </Enter>
            </View>
          ))
        : null}
    </View>
  );
}

function Art2() {
  const card = { fill: "rgba(255,255,255,0.08)", stroke: "rgba(255,255,255,0.16)" };
  return (
    <View style={styles.box}>
    <Svg width="100%" height="100%" viewBox="0 0 300 240">
      <PopG delay={pop(0)}>
        <Card y={20} {...card} />
        <Path d="M52 34 L42 52 H50 L45 64 L60 46 H52 Z" fill="#FFD400" />
      </PopG>
      <DrawPath length={20} delay={draw(0)} d="M150 78 V94" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <PopG delay={pop(1)}>
        <Card y={98} {...card} />
        <Circle cx={50} cy={125} r={11} fill="none" stroke="#5FD3BC" strokeWidth={3} />
        <Path d="M50 119v7l4 3" stroke="#5FD3BC" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </PopG>
      <DrawPath length={20} delay={draw(1)} d="M150 156 V172" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <PopG delay={pop(2)}>
        <Card y={176} fill="#FFD400" />
        <Path d="M40 216 L48 206 L54 211 L62 197" fill="none" stroke="#003A44" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </PopG>
    </Svg>
    <Art2Labels />
    </View>
  );
}

function Art3() {
  return (
    <Svg width="88%" height="88%" viewBox="0 0 300 240">
      <PopG delay={pop(0)}>
        <Path
          d="M150 30 L214 54 V114 C214 158 184 188 150 204 C116 188 86 158 86 114 V54 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="#5FD3BC"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </PopG>
      <PopG delay={pop(1)}>
        <Path d="M164 66 L132 124 H154 L140 172 L178 106 H154 Z" fill="#FFD400" />
      </PopG>
      <PopG delay={pop(2)}>
        <Circle cx={56} cy={66} r={9} fill="#FFD400" opacity={0.6} />
      </PopG>
      <PopG delay={pop(3)}>
        <Circle cx={248} cy={186} r={13} fill="#22A088" opacity={0.5} />
      </PopG>
      <PopG delay={pop(4)}>
        <Circle cx={250} cy={44} r={6} fill="#fff" opacity={0.5} />
      </PopG>
    </Svg>
  );
}

function Art4() {
  const bars = [
    { x: 56, y: 148, h: 56, fill: "#0B4F5C", stroke: "#5FD3BC" },
    { x: 104, y: 122, h: 82, fill: "#2C7DA6" },
    { x: 152, y: 96, h: 108, fill: "#22A088" },
    { x: 200, y: 60, h: 144, fill: "#FFD400" },
  ];
  return (
    <Svg width="88%" height="88%" viewBox="0 0 300 240">
      <Path d="M40 204 H262" stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeLinecap="round" />
      {bars.map((b, i) => (
        <PopG key={i} delay={pop(i)}>
          <Rect x={b.x} y={b.y} width={34} height={b.h} rx={8} fill={b.fill} stroke={b.stroke} strokeWidth={b.stroke ? 1.5 : 0} />
        </PopG>
      ))}
      <DrawPath length={210} delay={draw(0)} d="M60 126 L120 102 L168 76 L232 36" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <PopG delay={pop(4)}>
        <G>
          <Circle cx={232} cy={36} r={8} fill="#fff" />
        </G>
      </PopG>
    </Svg>
  );
}

export function WelcomeArt({ slide }: { slide: number }) {
  if (slide === 0) return <Art1 />;
  if (slide === 1) return <Art2 />;
  if (slide === 2) return <Art3 />;
  return <Art4 />;
}

const styles = StyleSheet.create({
  // Same footprint as the other drawings (92% of the art box, 300:240).
  box: { width: "92%", aspectRatio: 300 / 240 },
  labels: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
});
