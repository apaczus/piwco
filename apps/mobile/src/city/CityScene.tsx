// The player's city: 5 buildings on a strip of ground, drawn in SVG. Level 0 = empty plot, 1–3 = bigger buildings.
// Each building is its own absolutely positioned view (so it can later be animated from its base).
// Design units: the scene is 360 wide; everything scales with the real width.
import type { BuildingId, CityView } from "@piwco/engine";
import { Fragment, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { colors, font, mix } from "../theme";
import { BUILDING_INFO } from "./buildings";

const W = 360;
const GROUND = 28;
const SKY = 168;
export const SCENE_RATIO = (SKY + GROUND) / W;

// Left → right; Home and Company in the middle.
const SLOTS: { id: BuildingId; cx: number }[] = [
  { id: "shield", cx: 40 },
  { id: "home", cx: 110 },
  { id: "firm", cx: 186 },
  { id: "vault", cx: 262 },
  { id: "future", cx: 326 },
];

type Look = { night: boolean };
type Drawing = { w: number; h: number; body: ReactNode };

const shade = (c: string) => mix(c, colors.petrol950, 72);
const light = (c: string) => mix(c, "#FFFFFF", 62);
const windowFill = ({ night }: Look) => (night ? "#FFE27A" : "#EAF6F8");

function windows(x: number, y: number, cols: number, rows: number, w: number, h: number, gx: number, gy: number, look: Look) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      // At night a few windows stay dark, so the city looks lived in.
      out.push(
        <Rect
          key={`${r}-${c}`}
          x={x + c * (w + gx)}
          y={y + r * (h + gy)}
          width={w}
          height={h}
          rx={1}
          fill={look.night && (r * 3 + c * 5) % 7 === 0 ? shade(colors.petrol800) : windowFill(look)}
        />,
      );
  return out;
}

function shieldPath(cx: number, cy: number, s: number) {
  return `M${cx} ${cy - s} L${cx + s} ${cy - s * 0.6} L${cx + s} ${cy + s * 0.1} Q${cx + s} ${cy + s} ${cx} ${cy + s * 1.3} Q${cx - s} ${cy + s} ${cx - s} ${cy + s * 0.1} L${cx - s} ${cy - s * 0.6} Z`;
}

function drawHome(level: number, rented: boolean, look: Look): Drawing {
  const c = BUILDING_INFO.home.color;
  if (rented) {
    const h = [0, 54, 68, 84][level] ?? 54;
    const rows = Math.floor((h - 22) / 12);
    return {
      w: 50,
      h,
      body: (
        <G>
          <Rect x={5} y={4} width={40} height={h - 4} fill={c} />
          <Rect x={3} y={0} width={44} height={6} fill={shade(c)} />
          {windows(10, 12, 3, rows, 7, 7, 5, 5, look)}
          <Rect x={21} y={h - 12} width={8} height={12} fill={shade(c)} />
        </G>
      ),
    };
  }
  if (level <= 1)
    return {
      w: 48,
      h: 44,
      body: (
        <G>
          <Rect x={6} y={20} width={36} height={24} fill={c} />
          <Path d="M2 22 L24 4 L46 22 Z" fill={shade(c)} />
          <Rect x={26} y={30} width={8} height={14} fill={shade(c)} />
          <Rect x={11} y={27} width={8} height={8} rx={1} fill={windowFill(look)} />
        </G>
      ),
    };
  if (level === 2)
    return {
      w: 60,
      h: 58,
      body: (
        <G>
          <Rect x={42} y={8} width={6} height={14} fill={shade(c)} />
          <Rect x={6} y={26} width={48} height={32} fill={c} />
          <Path d="M2 28 L30 6 L58 28 Z" fill={shade(c)} />
          <Rect x={26} y={42} width={9} height={16} fill={shade(c)} />
          <Rect x={12} y={34} width={9} height={9} rx={1} fill={windowFill(look)} />
          <Rect x={40} y={34} width={9} height={9} rx={1} fill={windowFill(look)} />
        </G>
      ),
    };
  return {
    w: 72,
    h: 78,
    body: (
      <G>
        <Rect x={46} y={46} width={24} height={32} fill={light(c)} />
        <Rect x={44} y={42} width={28} height={5} fill={shade(c)} />
        <Rect x={4} y={32} width={44} height={46} fill={c} />
        <Path d="M0 34 L26 8 L52 34 Z" fill={shade(c)} />
        <Rect x={36} y={12} width={6} height={14} fill={shade(c)} />
        {windows(10, 40, 2, 2, 9, 9, 13, 8, look)}
        <Rect x={21} y={60} width={10} height={18} fill={shade(c)} />
        <Rect x={53} y={54} width={10} height={10} rx={1} fill={windowFill(look)} />
      </G>
    ),
  };
}

// Dark buildings are lifted at night so they stand out from the night sky.
const nightLift = (c: string, { night }: Look) => (night ? mix(c, "#FFFFFF", 80) : c);

function drawFirm(level: number, look: Look): Drawing {
  const c = nightLift(colors.petrol700, look);
  if (level <= 1)
    return {
      w: 56,
      h: 48,
      body: (
        <G>
          <Rect x={16} y={2} width={24} height={9} rx={2} fill={colors.yellow} />
          <Rect x={6} y={14} width={44} height={34} fill={c} />
          <Rect x={2} y={14} width={52} height={8} fill={light(c)} />
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={4 + i * 13} y={14} width={6} height={8} fill={colors.yellow} />
          ))}
          <Rect x={11} y={27} width={19} height={13} rx={1} fill={windowFill(look)} />
          <Rect x={35} y={27} width={10} height={21} fill={shade(c)} />
        </G>
      ),
    };
  if (level === 2)
    return {
      w: 56,
      h: 96,
      body: (
        <G>
          <Rect x={8} y={8} width={40} height={88} fill={c} />
          <Rect x={6} y={3} width={44} height={7} fill={shade(c)} />
          {windows(13, 16, 3, 6, 7, 7, 5, 4, look)}
          <Rect x={22} y={82} width={12} height={14} fill={shade(c)} />
        </G>
      ),
    };
  return {
    w: 66,
    h: 148,
    body: (
      <G>
        <Line x1={33} y1={0} x2={33} y2={16} stroke={shade(c)} strokeWidth={2} />
        <Circle cx={33} cy={2} r={2.5} fill={look.night ? "#FF6B5B" : shade(c)} />
        <Rect x={2} y={86} width={14} height={62} fill={shade(c)} />
        <Rect x={50} y={100} width={14} height={48} fill={shade(c)} />
        <Rect x={13} y={16} width={40} height={132} fill={c} />
        {windows(18, 24, 3, 10, 7, 6, 5, 5, look)}
        <Rect x={13} y={14} width={40} height={4} fill={colors.yellow} />
        <Rect x={27} y={134} width={12} height={14} fill={shade(c)} />
      </G>
    ),
  };
}

function drawVault(level: number, look: Look): Drawing {
  const c = BUILDING_INFO.vault.color;
  if (level <= 1)
    return {
      w: 44,
      h: 36,
      body: (
        <G>
          <Rect x={6} y={6} width={32} height={30} rx={4} fill={c} />
          <Circle cx={22} cy={21} r={8} fill="none" stroke={light(c)} strokeWidth={2.5} />
          <Line x1={22} y1={21} x2={27} y2={17} stroke={light(c)} strokeWidth={2} />
          <Rect x={10} y={34} width={5} height={2} fill={shade(c)} />
          <Rect x={29} y={34} width={5} height={2} fill={shade(c)} />
        </G>
      ),
    };
  const big = level >= 3;
  const w = big ? 72 : 60;
  const top = big ? 34 : 4;
  const cols = big ? 5 : 4;
  return {
    w,
    h: top + 54,
    body: (
      <G>
        {big ? (
          <G>
            <Path d={`M${w / 2 - 16} ${top + 2} A16 16 0 0 1 ${w / 2 + 16} ${top + 2} Z`} fill={light(c)} />
            <Rect x={w / 2 - 1} y={top - 22} width={2} height={8} fill={shade(c)} />
            <Circle cx={w / 2} cy={top - 23} r={2.5} fill={colors.yellow} />
          </G>
        ) : null}
        <Path d={`M2 ${top + 16} L${w / 2} ${top} L${w - 2} ${top + 16} Z`} fill={c} />
        <Circle cx={w / 2} cy={top + 10} r={3} fill={colors.yellow} />
        <Rect x={4} y={top + 16} width={w - 8} height={5} fill={shade(c)} />
        {Array.from({ length: cols }, (_, i) => (
          <Rect key={i} x={8 + i * ((w - 22) / (cols - 1))} y={top + 21} width={6} height={27} fill={light(c)} />
        ))}
        <Rect x={2} y={top + 48} width={w - 4} height={6} fill={shade(c)} />
        {look.night ? <Rect x={w / 2 - 5} y={top + 30} width={10} height={18} fill={windowFill(look)} opacity={0.8} /> : null}
      </G>
    ),
  };
}

function drawShield(level: number, look: Look): Drawing {
  const c = nightLift(BUILDING_INFO.shield.color, look);
  const emblem = mix(colors.yellow, "#FFFFFF", 70);
  if (level <= 1)
    return {
      w: 44,
      h: 46,
      body: (
        <G>
          <Rect x={8} y={16} width={28} height={30} fill={c} />
          <Path d="M5 18 L22 6 L39 18 Z" fill={shade(c)} />
          <Path d={shieldPath(22, 27, 7)} fill={emblem} />
          <Rect x={18} y={38} width={8} height={8} fill={shade(c)} />
        </G>
      ),
    };
  if (level === 2)
    return {
      w: 58,
      h: 64,
      body: (
        <G>
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={i} x={6 + i * 10} y={14} width={6} height={8} fill={c} />
          ))}
          <Rect x={6} y={20} width={46} height={44} fill={c} />
          <Path d={shieldPath(29, 36, 10)} fill={emblem} />
          {windows(12, 52, 2, 1, 6, 6, 26, 0, look)}
          <Rect x={25} y={52} width={8} height={12} fill={shade(c)} />
        </G>
      ),
    };
  return {
    w: 68,
    h: 94,
    body: (
      <G>
        {[0, 1, 2].map((i) => (
          <Rect key={`l${i}`} x={2 + i * 6} y={46} width={4} height={6} fill={shade(c)} />
        ))}
        {[0, 1, 2].map((i) => (
          <Rect key={`r${i}`} x={52 + i * 6} y={46} width={4} height={6} fill={shade(c)} />
        ))}
        <Rect x={2} y={52} width={16} height={42} fill={shade(c)} />
        <Rect x={50} y={52} width={16} height={42} fill={shade(c)} />
        {[0, 1, 2, 3].map((i) => (
          <Rect key={`t${i}`} x={18 + i * 9} y={4} width={5} height={8} fill={c} />
        ))}
        <Rect x={18} y={10} width={32} height={84} fill={c} />
        <Path d={shieldPath(34, 32, 11)} fill={emblem} />
        {windows(24, 56, 2, 2, 6, 7, 8, 6, look)}
        <Path d="M29 94 L29 84 Q34 78 39 84 L39 94 Z" fill={shade(c)} />
      </G>
    ),
  };
}

function drawFuture(level: number, look: Look): Drawing {
  const c = BUILDING_INFO.future.color;
  const h = [0, 64, 104, 146][level] ?? 64;
  const w = [0, 40, 46, 52][level] ?? 40;
  return {
    w,
    h,
    body: (
      <G>
        <Path d={`M4 ${h} L4 10 L${w / 2} 0 L${w - 4} 10 L${w - 4} ${h} Z`} fill={c} />
        <Path d={`M${w / 2} 0 L${w - 4} 10 L${w - 4} ${h} L${w / 2} ${h} Z`} fill={shade(c)} opacity={0.5} />
        {windows(9, 16, 2, Math.floor((h - 24) / 10), w / 2 - 12, 5, 6, 5, look)}
      </G>
    ),
  };
}

export function drawing(id: BuildingId, level: number, rented: boolean, look: Look): Drawing {
  switch (id) {
    case "home":
      return drawHome(level, rented, look);
    case "firm":
      return drawFirm(level, look);
    case "vault":
      return drawVault(level, look);
    case "shield":
      return drawShield(level, look);
    case "future":
      return drawFuture(level, look);
  }
}

// Cracks over a building whose side is paying off a loan (the debt is visible in the city).
function Cracks({ w, h }: { w: number; h: number }) {
  const x = w * 0.3;
  const y = h * 0.35;
  return (
    <G opacity={0.85}>
      <Path
        d={`M${x} ${y} l4 6 l-3 5 l5 7 l-2 6 M${x + 4} ${y + 6} l6 2 M${x + 2} ${y + 11} l-5 3`}
        stroke={colors.petrol950}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={`M${w * 0.68} ${h * 0.6} l-3 5 l4 4 l-2 5`}
        stroke={colors.petrol950}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

function Cloud({ u }: { u: number }) {
  return (
    <Svg width={44 * u} height={30 * u} viewBox="0 0 44 30">
      <Path d="M10 18 Q4 18 4 13 Q4 8 10 8 Q12 2 19 3 Q25 0 29 6 Q37 5 38 12 Q42 13 41 17 Q40 19 36 18 Z" fill="#8A9BA0" />
      {[12, 20, 28, 34].map((x, i) => (
        <Line key={x} x1={x} y1={21 + (i % 2) * 2} x2={x - 2} y2={27 + (i % 2) * 2} stroke="#7FB2C8" strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

// Where a building stands, in % of the scene (for animations that grow it from its base).
export type BuildingGeo = { cxPct: number; topPct: number; basePct: number };
export type BuildingDecorator = (id: BuildingId, building: ReactNode, geo: BuildingGeo) => ReactNode;

export function CityScene({
  city,
  night = false,
  showGround = true,
  onPressBuilding,
  decorate,
}: {
  city: CityView;
  night?: boolean;
  showGround?: boolean;
  onPressBuilding?: (id: BuildingId) => void;
  // Wraps each building (used for the level-up animations).
  decorate?: BuildingDecorator;
}) {
  const [width, setWidth] = useState(0);
  const u = width / W;
  const look: Look = { night };
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const plotInk = night ? colors.onPetrolMuted : colors.muted;

  return (
    <View onLayout={onLayout} style={{ width: "100%", aspectRatio: 1 / SCENE_RATIO }}>
      {width > 0 ? (
        <>
          {showGround ? (
            <View style={[styles.ground, { height: GROUND * u, backgroundColor: night ? colors.petrol800 : mix(colors.success, "#FFFFFF", 22) }]}>
              <View style={[styles.road, { top: GROUND * u * 0.45, backgroundColor: night ? "rgba(255,255,255,0.12)" : "rgba(0,38,45,0.1)" }]} />
            </View>
          ) : null}
          {SLOTS.map(({ id, cx }) => {
            const level = city.levels[id];
            const info = BUILDING_INFO[id];
            let node: ReactNode;
            let top: number;
            if (level === 0) {
              const pw = 58;
              top = SKY - 14;
              node = (
                <Pressable
                  disabled={!onPressBuilding}
                  onPress={() => onPressBuilding?.(id)}
                  style={{ position: "absolute", left: (cx - pw / 2) * u, bottom: (GROUND - 6) * u, width: pw * u, alignItems: "center" }}
                >
                  <Text style={[styles.plotText, { color: plotInk, fontSize: Math.max(8, 8.5 * u) }]} numberOfLines={2}>
                    {id === "future" ? "Future · Aug" : `+ ${info.name}`}
                  </Text>
                  <View style={[styles.plot, { height: 10 * u, borderColor: mix(info.color, night ? colors.petrol900 : "#FFFFFF", 70) }]} />
                </Pressable>
              );
            } else {
              const d = drawing(id, level, id === "home" && city.rentedHome, look);
              top = SKY - d.h;
              node = (
                <Pressable
                  disabled={!onPressBuilding}
                  onPress={() => onPressBuilding?.(id)}
                  style={{ position: "absolute", left: (cx - d.w / 2) * u, bottom: GROUND * u - 1, width: d.w * u, height: d.h * u }}
                >
                  <Svg width={d.w * u} height={d.h * u} viewBox={`0 0 ${d.w} ${d.h}`}>
                    {d.body}
                    {(id === "home" && city.damaged.home) || (id === "firm" && city.damaged.firm) ? <Cracks w={d.w} h={d.h} /> : null}
                  </Svg>
                </Pressable>
              );
            }
            const cloud = (id === "home" && city.clouds.home) || (id === "firm" && city.clouds.firm);
            const H = SKY + GROUND;
            const geo: BuildingGeo = { cxPct: (cx / W) * 100, topPct: (Math.max(0, top) / H) * 100, basePct: (SKY / H) * 100 };
            const wrapped = decorate ? decorate(id, node, geo) : node;
            return (
              <Fragment key={id}>
                {wrapped}
                {cloud ? (
                  <View pointerEvents="none" style={{ position: "absolute", left: (cx - 22) * u, top: Math.max(0, top - 34) * u }}>
                    <Cloud u={u} />
                  </View>
                ) : null}
              </Fragment>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: 6, overflow: "hidden" },
  road: { position: "absolute", left: 0, right: 0, height: 3 },
  plot: { alignSelf: "stretch", borderWidth: 1.5, borderStyle: "dashed", borderRadius: 4, marginTop: 3 },
  plotText: { fontFamily: font.bold, textAlign: "center" },
});
