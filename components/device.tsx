"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { cancelFrame, frame, motion, motionValue, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

export type DeviceFinish = "titanium" | "black" | "silver" | "gold" | "blue";
export type DeviceOrientation = "portrait" | "landscape";

export interface DeviceProps {
  image?: string;
  alt?: string;
  children?: ReactNode;
  finish?: DeviceFinish;
  frameColor?: string;
  screenColor?: string;
  shadowColor?: string;
  orientation?: DeviceOrientation;
  width?: number | string;
  scale?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  tilt?: number;
  float?: number;
  lift?: number;
  drag?: boolean;
  reflection?: number;
  shadow?: number;
  bezel?: number;
  island?: boolean;
  isScrollable?: boolean;
  interactive?: boolean;
  intro?: boolean;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  enableParallax?: boolean;
  parallaxStrength?: number;
  enableRotate?: boolean;
  rotateStrength?: number;
  autoAnimate?: boolean;
}

interface Settings {
  restX: number;
  restY: number;
  restZ: number;
  landscape: boolean;
  tilt: number;
  follow: boolean;
  float: number;
  lift: number;
  shadow: number;
  reflection: number;
  metal: string;
  shine: string;
  drag: boolean;
  interactive: boolean;
  scrollable: boolean;
  intro: boolean;
  paused: boolean;
  reduced: boolean;
}

interface Channels {
  body: MotionValue<string>;
  presence: MotionValue<number>;
  soft: MotionValue<string>;
  softOpacity: MotionValue<number>;
  tight: MotionValue<string>;
  tightOpacity: MotionValue<number>;
  glare: MotionValue<string>;
  glareOpacity: MotionValue<number>;
  content: MotionValue<string>;
  wake: MotionValue<number>;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  turn: number;
  height: number;
  appear: number;
}

interface Controller {
  sync: () => void;
  destroy: () => void;
}

type Vec3 = [number, number, number];

interface Facet {
  key: string;
  kind: "band" | "key" | "cap" | "control";
  x: number;
  y: number;
  angle: number;
  length: number;
  sweep: number;
  style: CSSProperties;
}

interface Press {
  id: number;
  x: number;
  y: number;
  time: number;
  nx: number;
  ny: number;
  size: number;
  rx: number;
  ry: number;
}

interface Painted {
  el: HTMLElement;
  index: number;
  image: string;
  blend: string;
}

const WIDTH = 100;
const HEIGHT = 209.2;
const DEPTH = 11.5;
const FRAME = 2.2;
const BEZEL = 1.7;
const RADIUS = 17.9;
const OUTER_ZONE = 1;
const ISLAND_TOP = 2.8;
const ARC_STEPS = 12;
const PROTRUDE = 0.9;
const KEY_DEPTH = 4.2;
const PERSPECTIVE = 520;
const BASE_WIDTH = 35.6;
const ASPECT = HEIGHT / WIDTH;
const HALF_W = WIDTH / 2;
const HALF_H = HEIGHT / 2;
const FRONT_Z = DEPTH / 2;
const LIMIT_Y = 70;
const LIMIT_X = 45;
const ROUGH = 0.3;
const EXPOSURE = 1.4;
const RAMP_SIZE = 64;
const HAIRLINE = "max(0.2cqmin, 1px)";

const FINISHES: Record<DeviceFinish, readonly [string, string]> = {
  titanium: ["#9C978F", "#EDEAE4"],
  black: ["#38383B", "#A6A6AB"],
  silver: ["#CBCAC6", "#FDFDFB"],
  gold: ["#B4937A", "#F4E2CF"],
  blue: ["#2F3B55", "#95A5C5"],
};

export const deviceFinishes: Record<DeviceFinish, string> = {
  titanium: FINISHES.titanium[0],
  black: FINISHES.black[0],
  silver: FINISHES.silver[0],
  gold: FINISHES.gold[0],
  blue: FINISHES.blue[0],
};

const DEFAULT_IMAGE = "https://pro.reactbits.dev/demo-media/abstract-rose-balance.webp";

const SURFACES = {
  back: "linear-gradient(155deg, color-mix(in oklch, var(--device-metal) 70%, white), var(--device-metal) 45%, color-mix(in oklch, var(--device-metal) 60%, black))",
  glass: `0 0 0 max(0.3cqmin, 1px) rgb(0 0 0 / 0.55), inset 0 0 0 max(0.14cqmin, 0.5px) rgb(255 255 255 / 0.22)`,
  edge: "inset 0 0 max(0.9cqmin, 2px) rgb(0 0 0 / 0.5), inset 0 0 max(0.25cqmin, 0.75px) rgb(0 0 0 / 0.55)",
  lens: "radial-gradient(circle at 34% 30%, rgb(255 255 255 / 0.85) 0, rgb(255 255 255 / 0) 10%), radial-gradient(circle at 50% 50%, #2a3a86 0%, #121c4f 30%, #070a20 56%, #010103 80%)",
  glare:
    "linear-gradient(125deg, rgb(255 255 255 / 0) 40.5%, rgb(255 255 255 / 0.02) 42.5%, rgb(255 255 255 / 0.055) 45%, rgb(255 255 255 / 0.095) 47.5%, rgb(255 255 255 / 0.12) 49.7%, rgb(255 255 255 / 0.095) 51.9%, rgb(255 255 255 / 0.055) 54.4%, rgb(255 255 255 / 0.02) 56.9%, rgb(255 255 255 / 0) 58.9%)",
};

const ui = {
  root: "group/device relative inline-block shrink-0 align-middle select-none [container-type:size] [-webkit-tap-highlight-color:transparent]",
  shadow:
    "pointer-events-none absolute left-1/2 top-1/2 -ml-[50cqmin] -mt-[104.6cqmin] h-[209.2cqmin] w-[100cqmin] rounded-[17.9cqmin] bg-[var(--device-shadow)] will-change-transform",
  shadowSoft: "blur-[6.5cqmin] group-data-[device-page=light]/device:blur-[9cqmin]",
  shadowTight: "blur-[1.6cqmin] group-data-[device-page=light]/device:blur-[2.2cqmin]",
  stage: "absolute inset-0 [perspective:520cqmin]",
  body: "absolute left-1/2 top-1/2 -ml-[50cqmin] -mt-[104.6cqmin] h-[209.2cqmin] w-[100cqmin] [transform-style:preserve-3d] will-change-transform",
  back: "absolute inset-0 rounded-[17.9cqmin] [backface-visibility:hidden] [transform:translateZ(-5.75cqmin)_rotateY(180deg)]",
  facet: "absolute left-0 top-0 bg-[var(--device-metal)] [backface-visibility:hidden]",
  band: "after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:[background-image:var(--device-b,none)] after:[-webkit-mask-image:linear-gradient(90deg,transparent,#000)] after:[mask-image:linear-gradient(90deg,transparent,#000)]",
  key: "rounded-[1.2cqmin]",
  control: "rounded-[1.8cqmin]",
  keyFront: "absolute bg-[var(--device-metal)] [backface-visibility:hidden]",
  front: "absolute inset-0 rounded-[17.9cqmin] [backface-visibility:hidden] [transform:translateZ(5.75cqmin)]",
  frame: "absolute inset-0 will-change-transform",
  ring: "absolute bg-[var(--device-metal)] bg-no-repeat",
  glass: "absolute inset-[2.2cqmin] overflow-hidden rounded-[15.7cqmin] bg-black [isolation:isolate]",
  screen: "absolute overflow-hidden bg-[var(--device-screen)]",
  content: "absolute",
  scroll: "overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  picture: "block h-full w-full",
  pictureTall: "h-auto min-h-full",
  image: "block h-full w-full object-cover [-webkit-user-drag:none]",
  imageTall: "h-auto min-h-full",
  screenEdge: "pointer-events-none absolute inset-0 rounded-[inherit]",
  wake: "pointer-events-none absolute inset-0 bg-black",
  island: "pointer-events-none absolute left-1/2 -ml-[16cqmin] h-[9cqmin] w-[32cqmin] rounded-full bg-black",
  lens: "absolute right-[2.9cqmin] top-1/2 -mt-[1.6cqmin] size-[3.2cqmin] rounded-full",
  glare:
    "pointer-events-none absolute left-1/2 top-1/2 -ml-[170cqmin] -mt-[170cqmin] size-[340cqmin] will-change-transform",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const fix = (value: number) => (Math.abs(value) < 0.0005 ? "0" : value.toFixed(3));
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const smooth = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};
const approach = (value: number, target: number, dt: number, tau: number) =>
  value + (target - value) * (1 - Math.exp(-dt / tau));

const spring = (value: number, velocity: number, target: number, omega: number, dt: number) => {
  const offset = value - target;
  const decay = Math.exp(-omega * dt);
  const lead = velocity + omega * offset;
  return [target + (offset + lead * dt) * decay, (velocity - omega * lead * dt) * decay] as const;
};

const limit = (raw: number, rest: number, bound: number) => {
  const delta = raw - rest;
  const room = Math.max(delta >= 0 ? bound - rest : bound + rest, 1);
  return rest + Math.sign(delta) * room * Math.tanh(Math.abs(delta) / room);
};

const soften = (angle: number, knee: number, bound: number) => {
  const size = Math.abs(angle);
  if (size <= knee) return angle;
  return Math.sign(angle) * (knee + (bound - knee) * Math.tanh((size - knee) / (bound - knee)));
};

const unit = (x: number, y: number, z: number): Vec3 => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

const LIGHTS = [
  { d: unit(-0.6, -0.55, 0.58), w: 1.6, lo: Math.cos(toRad(42)), hi: Math.cos(toRad(10)) },
  { d: unit(0.92, -0.18, -0.35), w: 1.7, lo: Math.cos(toRad(26)), hi: Math.cos(toRad(5)) },
  { d: unit(-0.95, 0.05, -0.3), w: 1.1, lo: Math.cos(toRad(28)), hi: Math.cos(toRad(6)) },
  { d: unit(0.15, -0.97, 0.18), w: 1.3, lo: Math.cos(toRad(38)), hi: Math.cos(toRad(12)) },
];
const KEY_LIGHT = LIGHTS[0].d;

const studio = (x: number, y: number, z: number) => {
  let energy = 0.12 - 0.12 * y;
  for (const light of LIGHTS) {
    const facing = x * light.d[0] + y * light.d[1] + z * light.d[2];
    if (facing > light.lo) energy += light.w * smooth(light.lo, light.hi, facing);
  }
  return energy;
};

const linear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
const gamma = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;

const toLab = ([r, g, b]: Vec3): Vec3 => {
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromLab = ([L, a, b]: Vec3): Vec3 => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const mixLab = (from: Vec3, to: Vec3, t: number): Vec3 => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

const toHex = (color: Vec3) =>
  `#${color
    .map((channel) =>
      Math.round(clamp(channel, 0, 1) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const readRgb = (value: string, doc: Document, fallback: Vec3): Vec3 => {
  const text = value.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
  if (short) return [1, 2, 3].map((i) => parseInt(short[i] + short[i], 16) / 255) as Vec3;
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(text);
  if (long) return [1, 2, 3].map((i) => parseInt(long[i], 16) / 255) as Vec3;
  try {
    const canvas = doc.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return fallback;
    context.fillStyle = "#010203";
    context.fillStyle = text;
    if (context.fillStyle === "#010203") return fallback;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
  } catch {
    return fallback;
  }
};

const buildRamp = (anchors: Array<[number, Vec3]>) =>
  Array.from({ length: RAMP_SIZE }, (_, index) => {
    const t = index / (RAMP_SIZE - 1);
    let k = 0;
    while (k < anchors.length - 2 && t > anchors[k + 1][0]) k++;
    const [t0, c0] = anchors[k];
    const [t1, c1] = anchors[k + 1];
    return toHex(fromLab(mixLab(c0, c1, clamp((t - t0) / (t1 - t0), 0, 1))));
  });

const metalRamp = (base: Vec3, highlight: Vec3) => {
  const lab = toLab(base);
  const shine = toLab(highlight);
  return buildRamp([
    [0, mixLab(lab, [0, 0, 0], 0.72)],
    [0.25, mixLab(lab, [0, 0, 0], 0.4)],
    [0.5, lab],
    [0.78, shine],
    [1, mixLab(shine, [1, 0, 0], 0.6)],
  ]);
};

const SAPPHIRE = buildRamp(
  (
    [
      [0, [0.012, 0.016, 0.02]],
      [0.3, [0.04, 0.047, 0.063]],
      [0.6, [0.09, 0.1, 0.133]],
      [0.85, [0.235, 0.259, 0.314]],
      [1, [0.553, 0.584, 0.651]],
    ] as Array<[number, Vec3]>
  ).map(([t, color]) => [t, toLab(color)] as [number, Vec3]),
);

const exposure = (energy: number) => clamp(1 - Math.exp(-Math.max(energy, 0) * EXPOSURE), 0, 1);

const tone = (ramp: string[], energy: number) => ramp[Math.round(exposure(energy) * (ramp.length - 1))];

const facetStyle = (x: number, y: number, length: number, depth: number, angle: number): CSSProperties => ({
  width: `${fix(length)}cqmin`,
  height: `${fix(depth)}cqmin`,
  marginLeft: `${fix(-length / 2)}cqmin`,
  marginTop: `${fix(-depth / 2)}cqmin`,
  transform: `translate3d(${fix(x)}cqmin, ${fix(y)}cqmin, 0) rotateZ(${fix(angle - 90)}deg) rotateX(-90deg)`,
});

const KEYS = [
  { side: -1, top: 36, length: 8 },
  { side: -1, top: 54, length: 15 },
  { side: -1, top: 75, length: 15 },
  { side: 1, top: 58, length: 23 },
];

const FACETS: Facet[] = (() => {
  const list: Facet[] = [];
  const add = (
    key: string,
    kind: Facet["kind"],
    x: number,
    y: number,
    length: number,
    depth: number,
    angle: number,
    sweep = 0,
  ) => {
    list.push({ key, kind, x, y, angle, length, sweep, style: facetStyle(x, y, length, depth, angle) });
  };
  const runs = [
    { name: "left", x: 0, y: 0, dx: 0, dy: 1, span: HEIGHT - 2 * RADIUS, count: 8, angle: 180 },
    { name: "right", x: WIDTH, y: 0, dx: 0, dy: 1, span: HEIGHT - 2 * RADIUS, count: 8, angle: 0 },
    { name: "top", x: 0, y: 0, dx: 1, dy: 0, span: WIDTH - 2 * RADIUS, count: 4, angle: 270 },
    { name: "bottom", x: 0, y: HEIGHT, dx: 1, dy: 0, span: WIDTH - 2 * RADIUS, count: 4, angle: 90 },
  ];
  for (const run of runs) {
    const piece = run.span / run.count;
    for (let i = 0; i < run.count; i++) {
      const along = RADIUS + (i + 0.5) * piece;
      add(
        `${run.name}-${i}`,
        "band",
        run.dx ? along : run.x,
        run.dy ? along : run.y,
        piece + 0.3,
        DEPTH,
        run.angle,
      );
    }
  }
  const step = 90 / ARC_STEPS;
  const chord = 2 * RADIUS * Math.tan(toRad(step / 2)) + 0.45;
  const corners = [
    [RADIUS, RADIUS, 180],
    [WIDTH - RADIUS, RADIUS, 270],
    [WIDTH - RADIUS, HEIGHT - RADIUS, 0],
    [RADIUS, HEIGHT - RADIUS, 90],
  ];
  corners.forEach(([cx, cy, start], corner) => {
    for (let i = 0; i < ARC_STEPS; i++) {
      const angle = start + (i + 0.5) * step;
      add(
        `arc-${corner}-${i}`,
        "band",
        cx + RADIUS * Math.cos(toRad(angle)),
        cy + RADIUS * Math.sin(toRad(angle)),
        chord,
        DEPTH,
        angle,
        step,
      );
    }
  });
  KEYS.forEach(({ side, top, length }, index) => {
    const outer = side < 0 ? -PROTRUDE : WIDTH + PROTRUDE;
    const middle = side < 0 ? -PROTRUDE / 2 : WIDTH + PROTRUDE / 2;
    add(`key-${index}`, "key", outer, top + length / 2, length, KEY_DEPTH, side < 0 ? 180 : 0);
    add(`cap-${index}-top`, "cap", middle, top + 0.02, PROTRUDE + 0.1, KEY_DEPTH, 270);
    add(`cap-${index}-bottom`, "cap", middle, top + length - 0.02, PROTRUDE + 0.1, KEY_DEPTH, 90);
  });
  add("control", "control", WIDTH + 0.16, 132, 14, 3.6, 0);
  return list;
})();

const FRONTS = KEYS.map(({ side, top, length }, index) => ({
  key: `front-${index}`,
  side,
  y: top + length / 2,
  style: {
    left: `${fix(side < 0 ? -PROTRUDE : WIDTH - 0.3)}cqmin`,
    top: `${fix(top)}cqmin`,
    width: `${fix(PROTRUDE + 0.3)}cqmin`,
    height: `${fix(length)}cqmin`,
    borderRadius: side < 0 ? "0.6cqmin 0 0 0.6cqmin" : "0 0.6cqmin 0.6cqmin 0",
    transform: `translateZ(${fix(KEY_DEPTH / 2 - 0.05)}cqmin)`,
  } satisfies CSSProperties,
}));

const ringLayout = (radius: string): CSSProperties => {
  const span = `calc(100% - 2 * ${radius})`;
  return {
    backgroundSize: [
      `${radius} ${radius}`,
      `${radius} ${radius}`,
      `${radius} ${radius}`,
      `${radius} ${radius}`,
      `${span} ${radius}`,
      `${radius} ${span}`,
      `${span} ${radius}`,
      `${radius} ${span}`,
    ].join(", "),
    backgroundPosition: `0 0, 100% 0, 100% 100%, 0 100%, ${radius} 0, 100% ${radius}, ${radius} 100%, 0 ${radius}`,
  };
};

const RINGS = [
  { alpha: 80, gain: 1.35, floor: 0.55, rough: 0.15, inset: "0", radius: `${RADIUS}cqmin` },
  { alpha: 52, gain: 1.1, floor: 0, rough: 0.22, inset: HAIRLINE, radius: `calc(${RADIUS}cqmin - ${HAIRLINE})` },
  { alpha: 12, gain: 1, floor: 0, rough: 0.55, inset: `${OUTER_ZONE}cqmin`, radius: `${RADIUS - OUTER_ZONE}cqmin` },
].map((ring) => ({
  ...ring,
  style: { inset: ring.inset, borderRadius: ring.radius, ...ringLayout(ring.radius) } satisfies CSSProperties,
}));

const CORNERS = [
  { cx: RADIUS - HALF_W, cy: RADIUS - HALF_H, start: 180, from: 270, at: "100% 100%" },
  { cx: HALF_W - RADIUS, cy: RADIUS - HALF_H, start: 270, from: 0, at: "0% 100%" },
  { cx: HALF_W - RADIUS, cy: HALF_H - RADIUS, start: 0, from: 90, at: "0% 0%" },
  { cx: RADIUS - HALF_W, cy: HALF_H - RADIUS, start: 90, from: 180, at: "100% 0%" },
];

const SIDES = [
  { phi: 270, a: 0, b: 1, mx: 0, my: RADIUS - HALF_H, dir: 90 },
  { phi: 0, a: 1, b: 2, mx: HALF_W - RADIUS, my: 0, dir: 180 },
  { phi: 90, a: 3, b: 2, mx: 0, my: HALF_H - RADIUS, dir: 90 },
  { phi: 180, a: 0, b: 3, mx: RADIUS - HALF_W, my: 0, dir: 180 },
];

const PROFILES: Record<Facet["kind"], Array<[number, number]>> = {
  band: [
    [72, 0],
    [42, 6],
    [12, 16],
    [0, 50],
    [-12, 84],
    [-42, 94],
    [-72, 100],
  ],
  key: [
    [48, 0],
    [20, 18],
    [0, 50],
    [-20, 82],
    [-48, 100],
  ],
  cap: [
    [40, 0],
    [0, 50],
    [-40, 100],
  ],
  control: [
    [30, 0],
    [0, 50],
    [-30, 100],
  ],
};

const subscribeToMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const resolveSize = (width: number | string | undefined, scale: number | undefined) => {
  if (typeof width === "number" && Number.isFinite(width)) return `${Math.max(width, 1)}px`;
  if (typeof width === "string" && width.trim()) return width.trim();
  return `${fix(BASE_WIDTH * clamp(finite(scale, 0.5), 0.05, 4))}rem`;
};

const drift = (clock: number, amount: number) => ({
  x: amount * (1.5 * Math.sin(clock * 0.69 + 0.6) + 0.45 * Math.sin(clock * 1.27 + 2.1)),
  y: amount * (2.6 * Math.sin(clock * 0.53) + 0.7 * Math.sin(clock * 1.13 + 1.3)),
  z: amount * 0.45 * Math.sin(clock * 0.41 + 1.9),
  lift: amount * 0.22 * (1 + Math.sin(clock * 0.83 + 0.4)),
});

const angles = (pose: Pose) => ({
  x: soften(pose.x + (1 - pose.appear) * 16, 40, 62),
  y: soften(pose.y, 55, 76),
  z: pose.z,
});

const writePose = (channels: Channels, pose: Pose, settings: Settings, light: boolean) => {
  const { x, y, z } = angles(pose);
  const drop = (1 - pose.appear) * 12;
  const height = Math.max(pose.height, 0);
  const presence = smooth(0, 0.55, pose.appear);
  const sx = -Math.sin(toRad(y)) * 3.2;
  const sy = Math.sin(toRad(x)) * 3.2;
  const squeeze = `scale(${fix(Math.max(Math.cos(toRad(y)), 0.25))}, ${fix(Math.max(Math.cos(toRad(x)), 0.25))})`;
  const strength = clamp(settings.shadow, 0, 2) * (light ? 0.7 : 1);
  const facing = Math.cos(toRad(x)) * Math.cos(toRad(y));
  channels.body.set(
    `translate3d(0, ${fix(drop)}cqmin, ${fix(height * 7)}cqmin) rotateX(${fix(x)}deg) rotateY(${fix(y)}deg) rotateZ(${fix(z)}deg)`,
  );
  channels.presence.set(presence);
  channels.soft.set(
    `translate3d(${fix(sx * 1.4)}cqmin, ${fix(drop + 5.5 + height * 6 + sy * 1.4)}cqmin, 0) ${squeeze} rotate(${fix(z)}deg) scale(${fix(0.93 + height * 0.04)})`,
  );
  channels.softOpacity.set(strength * 0.44 * (1 - Math.min(height, 1.5) * 0.15) * presence);
  channels.tight.set(
    `translate3d(${fix(sx * 0.6)}cqmin, ${fix(drop + 1.4 + height * 2.4 + sy * 0.6)}cqmin, 0) ${squeeze} rotate(${fix(z)}deg) scale(${fix(0.985 - height * 0.015)})`,
  );
  channels.tightOpacity.set(strength * 0.58 * Math.max(1 - height * 0.85, 0) * presence);
  channels.glare.set(`rotate(${fix(-z)}deg) translate3d(${fix(y * 2.1)}cqmin, ${fix(-x * 2.1)}cqmin, 0)`);
  channels.glareOpacity.set(
    (clamp(settings.reflection, 0, 2) / 2) * (1 + 4 * Math.pow(Math.max(1 - facing, 0), 1.5)),
  );
  channels.content.set(`rotate(${fix(-pose.turn)}deg)`);
  channels.wake.set(1 - smooth(0.3, 0.95, pose.appear));
};

const restingPose = (settings: Settings): Pose => {
  const sway = drift(0, settings.reduced ? 0 : settings.float);
  const turn = settings.landscape ? -90 : 0;
  return {
    x: settings.restX + sway.x,
    y: settings.restY + sway.y,
    z: turn + settings.restZ + sway.z,
    turn,
    height: sway.lift,
    appear: settings.intro && !settings.reduced ? 0 : 1,
  };
};

const createChannels = (settings: Settings) => {
  const channels: Channels = {
    body: motionValue(""),
    presence: motionValue(1),
    soft: motionValue(""),
    softOpacity: motionValue(0),
    tight: motionValue(""),
    tightOpacity: motionValue(0),
    glare: motionValue(""),
    glareOpacity: motionValue(0.5),
    content: motionValue(""),
    wake: motionValue(0),
  };
  writePose(channels, restingPose(settings), settings, false);
  return channels;
};

function createDevice(
  root: HTMLDivElement,
  content: HTMLDivElement | null,
  channels: Channels,
  settingsRef: RefObject<Settings>,
): Controller {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const settings = () => settingsRef.current;
  const collect = (attribute: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(`[${attribute}]`)).map((el) => ({
      el,
      index: Number(el.getAttribute(attribute) ?? 0),
      image: "",
      blend: "",
    }));
  const rings: Painted[] = collect("data-device-ring");
  const facets: Painted[] = collect("data-device-facet");
  const fronts: Painted[] = collect("data-device-front");
  const initial = settings();
  let rx = initial.restX;
  let ry = initial.restY;
  let vx = 0;
  let vy = 0;
  let rz = initial.restZ;
  let vz = 0;
  let turn = initial.landscape ? -90 : 0;
  let vt = 0;
  let height = 0;
  let vh = 0;
  let appear = initial.intro && !initial.reduced ? 0 : 1;
  let va = 0;
  let engage = 0;
  let amp = initial.reduced ? 0 : initial.float;
  let clock = 0;
  let sway = drift(0, amp);
  let hovering = false;
  let hx = 0;
  let hy = 0;
  let press: Press | null = null;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let loose = false;
  let scrollTarget = 0;
  let scrolling = false;
  let visible = false;
  let running = false;
  let destroyed = false;
  let last = 0;
  let paletteKey = "";
  let ramp: string[] = [];
  let shaded: Vec3 = [Number.NaN, 0, 0];
  let light = false;
  let lightAt = -Infinity;

  const readPage = () => {
    let node: HTMLElement | null = root.parentElement;
    while (node) {
      const match = view.getComputedStyle(node).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        if (parts.length < 4 || parts[3] > 0.05)
          return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2] > 140;
      }
      node = node.parentElement;
    }
    return !view.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const checkPage = (now: number) => {
    if (now - lightAt < 1200) return;
    lightAt = now;
    const next = readPage();
    if (next === light && root.dataset.devicePage) return;
    light = next;
    root.dataset.devicePage = light ? "light" : "dark";
  };

  const syncPalette = () => {
    const s = settings();
    const key = `${s.metal}|${s.shine}`;
    if (key === paletteKey) return false;
    paletteKey = key;
    const base = readRgb(s.metal, doc, [0.6, 0.6, 0.6]);
    const highlight = s.shine
      ? readRgb(s.shine, doc, [0.9, 0.9, 0.9])
      : fromLab(mixLab(toLab(base), [1, 0, 0], 0.62));
    ramp = metalRamp(base, highlight);
    return true;
  };

  const paint = (target: Painted, image: string, blend = "") => {
    if (target.image !== image) {
      target.image = image;
      target.el.style.backgroundImage = image;
    }
    if (blend && target.blend !== blend) {
      target.blend = blend;
      target.el.style.setProperty("--device-b", blend);
    }
  };

  const shade = (ax: number, ay: number, az: number, force: boolean) => {
    if (
      !force &&
      Math.abs(ax - shaded[0]) + Math.abs(ay - shaded[1]) + Math.abs(az - shaded[2]) < 0.2
    )
      return;
    shaded = [ax, ay, az];
    const cx = Math.cos(toRad(ax));
    const sx = Math.sin(toRad(ax));
    const cy = Math.cos(toRad(ay));
    const sy = Math.sin(toRad(ay));
    const cz = Math.cos(toRad(az));
    const sz = Math.sin(toRad(az));
    const spin = (x: number, y: number, z: number): Vec3 => {
      const x1 = x * cz - y * sz;
      const y1 = x * sz + y * cz;
      const x2 = x1 * cy + z * sy;
      const z2 = -x1 * sy + z * cy;
      return [x2, y1 * cx - z2 * sx, y1 * sx + z2 * cx];
    };
    let facing = 0;
    const energy = (nx: number, ny: number, nz: number, px: number, py: number, pz: number, rough: number) => {
      const n = spin(nx, ny, nz);
      const p = spin(px, py, pz);
      const v = unit(-p[0], -p[1], PERSPECTIVE - p[2]);
      const d = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
      facing = d;
      const gloss = studio(2 * d * n[0] - v[0], 2 * d * n[1] - v[1], 2 * d * n[2] - v[2]);
      const matte =
        0.16 +
        0.5 * Math.max(n[0] * KEY_LIGHT[0] + n[1] * KEY_LIGHT[1] + n[2] * KEY_LIGHT[2], 0) +
        0.18 * (0.5 - 0.5 * n[1]);
      return gloss + (matte - gloss) * rough;
    };
    for (const target of rings) {
      const ring = RINGS[target.index];
      if (!ring) continue;
      const sa = Math.sin(toRad(ring.alpha));
      const ca = Math.cos(toRad(ring.alpha));
      const color = (phi: number, px: number, py: number) =>
        tone(
          ramp,
          Math.max(
            energy(sa * Math.cos(toRad(phi)), sa * Math.sin(toRad(phi)), ca, px, py, FRONT_Z, ring.rough) * ring.gain,
            ring.floor,
          ),
        );
      const layers = CORNERS.map((corner) => {
        const stops = [0, 1, 2, 3, 4, 5, 6].map(
          (i) => `${color(corner.start + i * 15, corner.cx, corner.cy)} ${i * 15}deg`,
        );
        return `conic-gradient(from ${corner.from}deg at ${corner.at}, ${stops.join(", ")})`;
      });
      for (const side of SIDES) {
        const a = CORNERS[side.a];
        const b = CORNERS[side.b];
        layers.push(
          `linear-gradient(${side.dir}deg, ${color(side.phi, a.cx, a.cy)}, ${color(side.phi, side.mx, side.my)}, ${color(side.phi, b.cx, b.cy)})`,
        );
      }
      paint(target, layers.join(", "));
    }
    for (const target of facets) {
      const facet = FACETS[target.index];
      if (!facet) continue;
      const ox = Math.cos(toRad(facet.angle));
      const oy = Math.sin(toRad(facet.angle));
      const px = facet.x - HALF_W;
      const py = facet.y - HALF_H;
      energy(ox, oy, 0, px, py, 0, 0);
      if (facing < -0.05) continue;
      const palette = facet.kind === "control" ? SAPPHIRE : ramp;
      const rough = facet.kind === "band" ? ROUGH : facet.kind === "control" ? 0.08 : 0.2;
      const gain = facet.kind === "key" ? 1.15 : 1;
      const profile = (s: number) => {
        const phi = toRad(facet.angle - (s * facet.sweep) / 2);
        const nx = Math.cos(phi);
        const ny = Math.sin(phi);
        const reach = (s * facet.length) / 2;
        const stops = PROFILES[facet.kind].map(([psi, at]) => {
          const t = toRad(psi);
          const value = energy(nx * Math.cos(t), ny * Math.cos(t), Math.sin(t), px + reach * oy, py - reach * ox, 0, rough);
          return `${tone(palette, value * gain)} ${at}%`;
        });
        return `linear-gradient(180deg, ${stops.join(", ")})`;
      };
      if (facet.kind === "band") paint(target, profile(-1), profile(1));
      else paint(target, profile(0));
    }
    for (const target of fronts) {
      const front = FRONTS[target.index];
      if (!front) continue;
      const px = front.side * (HALF_W + 0.4);
      const py = front.y - HALF_H;
      const outer = tone(
        ramp,
        energy(front.side * Math.sin(toRad(70)), 0, Math.cos(toRad(70)), px, py, KEY_DEPTH / 2, 0.25) * 1.1,
      );
      const inner = tone(
        ramp,
        energy(front.side * Math.sin(toRad(20)), 0, Math.cos(toRad(20)), px, py, KEY_DEPTH / 2, 0.25),
      );
      paint(
        target,
        front.side < 0 ? `linear-gradient(90deg, ${outer}, ${inner})` : `linear-gradient(90deg, ${inner}, ${outer})`,
      );
    }
  };

  const stop = () => {
    if (!running) return;
    running = false;
    cancelFrame(tick);
    last = 0;
  };

  const wake = () => {
    if (destroyed || running || !visible || doc.hidden) return;
    running = true;
    last = 0;
    frame.update(tick, true);
  };

  function tick() {
    if (destroyed) return;
    const now = performance.now();
    const dt = last && now - last < 100 ? clamp((now - last) / 1000, 0, 0.05) : 1 / 60;
    last = now;
    const s = settings();
    const calm = s.reduced;
    checkPage(now);
    const recolored = syncPalette();
    if (calm) {
      appear = 1;
      va = 0;
    } else if (appear < 1) {
      [appear, va] = spring(appear, va, 1, 6.2, dt);
      if (Math.abs(1 - appear) < 0.0005 && Math.abs(va) < 0.001) {
        appear = 1;
        va = 0;
      }
    }
    const hoverActive = !calm && s.interactive && s.follow && hovering;
    const engaged = dragging || hoverActive;
    engage = calm ? 0 : approach(engage, engaged ? 1 : 0, dt, 0.32);
    const ampTarget = calm ? 0 : s.float * (1 - engage);
    amp = calm ? 0 : approach(amp, ampTarget, dt, 0.45);
    if (!calm && !s.paused) clock += dt;
    sway = drift(clock, amp);
    let tx = s.restX;
    let ty = s.restY;
    if (dragging) {
      tx = dragX;
      ty = dragY;
    } else if (hoverActive) {
      tx = s.restX - hy * s.tilt;
      ty = s.restY + hx * s.tilt;
    }
    const tt = s.landscape ? -90 : 0;
    const ht = s.lift * (dragging ? 1.2 : engage);
    if (calm) {
      rx = tx;
      ry = ty;
      vx = 0;
      vy = 0;
      rz = s.restZ;
      vz = 0;
      turn = tt;
      vt = 0;
      height = 0;
      vh = 0;
    } else {
      const omega = dragging ? 24 : loose ? 6.5 : 8.5;
      [rx, vx] = spring(rx, vx, tx, omega, dt);
      [ry, vy] = spring(ry, vy, ty, omega, dt);
      [rz, vz] = spring(rz, vz, s.restZ, 7, dt);
      [turn, vt] = spring(turn, vt, tt, 7, dt);
      [height, vh] = spring(height, vh, ht, 9, dt);
    }
    if (loose && Math.abs(rx - tx) + Math.abs(ry - ty) < 0.3 && Math.abs(vx) + Math.abs(vy) < 3) loose = false;
    const pose: Pose = {
      x: rx + sway.x,
      y: ry + sway.y,
      z: turn + rz + sway.z,
      turn,
      height: height + sway.lift,
      appear,
    };
    writePose(channels, pose, s, light);
    const final = angles(pose);
    shade(final.x, final.y, final.z, recolored);
    if (scrolling && content) {
      const next = approach(content.scrollTop, scrollTarget, dt, 0.11);
      if (Math.abs(scrollTarget - next) < 0.5) {
        content.scrollTop = scrollTarget;
        scrolling = false;
      } else {
        content.scrollTop = next;
      }
    }
    const settling =
      Math.abs(rx - tx) + Math.abs(ry - ty) + Math.abs(vx) + Math.abs(vy) > 0.01 ||
      Math.abs(rz - s.restZ) + Math.abs(vz) + Math.abs(turn - tt) + Math.abs(vt) > 0.01 ||
      Math.abs(height - ht) + Math.abs(vh) > 0.001 ||
      appear < 1 ||
      Math.abs(engage - (engaged ? 1 : 0)) > 0.001 ||
      Math.abs(amp - ampTarget) > 0.001;
    const moving = !calm && !s.paused && amp > 0.001;
    if (!visible || doc.hidden || !(moving || settling || scrolling || dragging)) stop();
  }

  const locate = (event: PointerEvent) => {
    const box = root.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - box.left) / Math.max(box.width, 1)) * 2 - 1, -1, 1),
      y: clamp(((event.clientY - box.top) / Math.max(box.height, 1)) * 2 - 1, -1, 1),
      size: Math.max(Math.min(box.width, box.height), 80),
    };
  };

  const release = (tap: boolean) => {
    const current = press;
    press = null;
    if (!current) return;
    if (dragging) {
      dragging = false;
      loose = true;
      try {
        if (root.hasPointerCapture(current.id)) root.releasePointerCapture(current.id);
      } catch {}
      wake();
      return;
    }
    const s = settings();
    if (!tap || !s.interactive || s.reduced) return;
    if (performance.now() - current.time > 450) return;
    vy += current.nx * 120;
    vx -= current.ny * 120;
    loose = true;
    wake();
  };

  const onPointerDown = (event: PointerEvent) => {
    const s = settings();
    if (!s.interactive || s.reduced || press) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const spot = locate(event);
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      nx: spot.x,
      ny: spot.y,
      size: spot.size,
      rx,
      ry,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    const s = settings();
    if (press && event.pointerId === press.id) {
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (
        !dragging &&
        s.drag &&
        s.interactive &&
        !s.reduced &&
        Math.hypot(dx, dy) > (event.pointerType === "touch" ? 8 : 4)
      ) {
        dragging = true;
        loose = false;
        rx += sway.x;
        ry += sway.y;
        rz += sway.z;
        height += sway.lift;
        amp = 0;
        engage = 1;
        sway = drift(clock, 0);
        press.rx = rx;
        press.ry = ry;
        press.x = event.clientX;
        press.y = event.clientY;
        try {
          root.setPointerCapture(event.pointerId);
        } catch {}
      }
      if (dragging) {
        const gain = 100 / press.size;
        dragY = limit(press.ry + (event.clientX - press.x) * gain, s.restY, LIMIT_Y);
        dragX = limit(press.rx - (event.clientY - press.y) * gain * 0.8, s.restX, LIMIT_X);
        wake();
        return;
      }
    }
    if (event.pointerType === "touch") return;
    const spot = locate(event);
    hx = spot.x;
    hy = spot.y;
    hovering = true;
    wake();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (press && event.pointerId === press.id) release(true);
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (press && event.pointerId === press.id) release(false);
  };

  const onLostCapture = (event: PointerEvent) => {
    if (dragging && press && event.pointerId === press.id) release(false);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovering = false;
    wake();
  };

  const onBlur = () => {
    if (press) release(false);
    hovering = false;
    wake();
  };

  const onWheel = (event: WheelEvent) => {
    const s = settings();
    if (!s.scrollable || !content || event.defaultPrevented || event.ctrlKey) return;
    const room = content.scrollHeight - content.clientHeight;
    if (room <= 0) return;
    const unitSize = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? content.clientHeight : 1;
    const delta = clamp(event.deltaY * unitSize, -240, 240);
    const base = scrolling ? scrollTarget : content.scrollTop;
    const next = clamp(base + delta, 0, room);
    if (Math.abs(next - base) < 0.5) return;
    event.preventDefault();
    scrollTarget = next;
    if (s.reduced) {
      content.scrollTop = next;
      return;
    }
    scrolling = true;
    wake();
  };

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry ? entry.isIntersecting : true;
      if (visible) wake();
      else stop();
    },
    { rootMargin: "120px" },
  );

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerCancel);
  root.addEventListener("lostpointercapture", onLostCapture);
  root.addEventListener("pointerleave", onPointerLeave);
  content?.addEventListener("wheel", onWheel, { passive: false });
  view.addEventListener("blur", onBlur);
  doc.addEventListener("visibilitychange", onVisibility);
  intersection.observe(root);
  checkPage(performance.now());
  syncPalette();
  const first = angles(restingPose(initial));
  shade(first.x, first.y, first.z, true);

  return {
    sync: () => {
      lightAt = -Infinity;
      last = 0;
      if (syncPalette()) shade(shaded[0], shaded[1], shaded[2], true);
      wake();
    },
    destroy: () => {
      destroyed = true;
      stop();
      intersection.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerCancel);
      root.removeEventListener("lostpointercapture", onLostCapture);
      root.removeEventListener("pointerleave", onPointerLeave);
      content?.removeEventListener("wheel", onWheel);
      view.removeEventListener("blur", onBlur);
      doc.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export const Device = forwardRef<HTMLDivElement, DeviceProps>(function Device(
  {
    image = DEFAULT_IMAGE,
    alt = "Device screen",
    children,
    finish = "black",
    frameColor,
    screenColor = "#000000",
    shadowColor = "#0b0c16",
    orientation = "portrait",
    width,
    scale = 0.5,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    tilt,
    float = 1,
    lift,
    drag = true,
    reflection = 1,
    shadow = 1,
    bezel = 1,
    island = true,
    isScrollable = false,
    interactive = true,
    intro = true,
    paused = false,
    className,
    style,
    enableParallax = true,
    parallaxStrength,
    enableRotate = true,
    rotateStrength,
    autoAnimate = false,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
  const landscape = orientation === "landscape";
  const named = FINISHES[finish] ?? FINISHES.black;
  const metal = frameColor?.trim() ? frameColor.trim() : named[0];

  const settings: Settings = {
    restX: clamp(finite(rotateX, 0), -60, 60),
    restY: clamp(finite(rotateY, 0), -60, 60),
    restZ: clamp(finite(rotateZ, 0), -180, 180),
    landscape,
    tilt: enableRotate ? clamp(finite(tilt ?? rotateStrength, 10), 0, 30) : 0,
    follow: !autoAnimate,
    float: autoAnimate ? Math.max(clamp(finite(float, 1), 0, 3), 1.6) : clamp(finite(float, 1), 0, 3),
    lift: enableParallax
      ? clamp(finite(lift ?? (parallaxStrength === undefined ? undefined : parallaxStrength / 15), 1), 0, 3)
      : 0,
    shadow: clamp(finite(shadow, 1), 0, 2),
    reflection: clamp(finite(reflection, 1), 0, 2),
    metal,
    shine: frameColor?.trim() ? "" : named[1],
    drag: drag && enableRotate,
    interactive,
    scrollable: isScrollable,
    intro,
    paused,
    reduced,
  };
  const settingsRef = useRef(settings);
  const [channels] = useState(() => createChannels(settings));

  useEffect(() => {
    settingsRef.current = settings;
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controller = createDevice(root, contentRef.current, channels, settingsRef);
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [channels]);

  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);

  const size = resolveSize(width, scale);
  const gap = clamp(finite(bezel, 1), 0, 4) * BEZEL;
  const screenWidth = WIDTH - 2 * (FRAME + gap);
  const screenHeight = HEIGHT - 2 * (FRAME + gap);
  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    width: landscape ? `calc(${size} * ${fix(ASPECT)})` : size,
    aspectRatio: landscape ? `${fix(ASPECT)} / 1` : `1 / ${fix(ASPECT)}`,
    touchAction: interactive && drag && enableRotate ? "pan-y" : undefined,
    "--device-metal": metal,
    "--device-screen": screenColor,
    "--device-shadow": shadowColor,
    ...style,
  };
  const contentStyle: CSSProperties = landscape
    ? {
        left: "50%",
        top: "50%",
        width: `${fix(screenHeight)}cqmin`,
        height: `${fix(screenWidth)}cqmin`,
        marginLeft: `${fix(-screenHeight / 2)}cqmin`,
        marginTop: `${fix(-screenWidth / 2)}cqmin`,
      }
    : { inset: 0 };

  return (
    <div ref={rootRef} className={cn(ui.root, className)} style={rootStyle}>
      <motion.div
        aria-hidden
        className={cn(ui.shadow, ui.shadowSoft)}
        style={{ transform: channels.soft, opacity: channels.softOpacity }}
      />
      <motion.div
        aria-hidden
        className={cn(ui.shadow, ui.shadowTight)}
        style={{ transform: channels.tight, opacity: channels.tightOpacity }}
      />
      <motion.div className={ui.stage} style={{ opacity: channels.presence }}>
        <motion.div className={ui.body} style={{ transform: channels.body }}>
          <div aria-hidden className={ui.back} style={{ backgroundImage: SURFACES.back }} />
          {FACETS.map((facet, index) => (
            <div
              key={facet.key}
              aria-hidden
              data-device-facet={index}
              className={cn(
                ui.facet,
                facet.kind === "band" && ui.band,
                facet.kind === "key" && ui.key,
                facet.kind === "control" && ui.control,
              )}
              style={facet.style}
            />
          ))}
          {FRONTS.map((front, index) => (
            <div key={front.key} aria-hidden data-device-front={index} className={ui.keyFront} style={front.style} />
          ))}
          <div className={ui.front}>
            <div aria-hidden className={ui.frame}>
              {RINGS.map((ring, index) => (
                <div key={ring.alpha} data-device-ring={index} className={ui.ring} style={ring.style} />
              ))}
            </div>
            <div className={ui.glass} style={{ boxShadow: SURFACES.glass }}>
              <div
                className={ui.screen}
                style={{
                  inset: `${fix(gap)}cqmin`,
                  borderRadius: `${fix(Math.max(RADIUS - FRAME - gap, 2))}cqmin`,
                }}
              >
                <motion.div
                  ref={contentRef}
                  className={cn(ui.content, isScrollable && ui.scroll)}
                  style={{ ...contentStyle, transform: channels.content }}
                >
                  {children ? (
                    children
                  ) : (
                    <picture className={cn(ui.picture, isScrollable && ui.pictureTall)}>
                      <img
                        src={image}
                        alt={alt}
                        draggable={false}
                        className={cn(ui.image, isScrollable && ui.imageTall)}
                        style={{ objectPosition: landscape ? "center" : "top" }}
                      />
                    </picture>
                  )}
                </motion.div>
                <div aria-hidden className={ui.screenEdge} style={{ boxShadow: SURFACES.edge }} />
                <motion.div aria-hidden className={ui.wake} style={{ opacity: channels.wake }} />
              </div>
              {island && (
                <div aria-hidden className={ui.island} style={{ top: `${fix(gap + ISLAND_TOP)}cqmin` }}>
                  <span className={ui.lens} style={{ backgroundImage: SURFACES.lens }} />
                </div>
              )}
              <motion.div
                aria-hidden
                className={ui.glare}
                style={{
                  transform: channels.glare,
                  opacity: channels.glareOpacity,
                  backgroundImage: SURFACES.glare,
                }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

Device.displayName = "Device";

export default Device;
