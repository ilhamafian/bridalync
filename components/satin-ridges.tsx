"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface SatinRidgesProps {
  colors?: string[];
  backgroundColor?: string;
  angle?: number;
  scale?: number;
  depth?: number;
  warp?: number;
  detail?: number;
  gloss?: number;
  highlight?: number;
  sheen?: number;
  lightAngle?: number;
  flow?: number;
  speed?: number;
  interactive?: boolean;
  swell?: number;
  swellRadius?: number;
  clickRipples?: boolean;
  seed?: number;
  paused?: boolean;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const MAX_RIPPLES = 4;
const DEFAULT_COLORS = ["#2A2A30", "#A1A1B5"];

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

#define MAX_RIPPLES ${MAX_RIPPLES}

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uShadow;
uniform vec3 uBody;
uniform vec3 uSheen;
uniform vec2 uAlong;
uniform float uScale;
uniform float uDepth;
uniform float uWarp;
uniform float uDetail;
uniform float uGloss;
uniform float uHighlight;
uniform float uSheenStrength;
uniform vec3 uLight;
uniform float uSeed;
uniform vec3 uSwell;
uniform float uSwellRadius;
uniform vec4 uRipple[MAX_RIPPLES];

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float surface(vec2 p) {
  float t = uTime;
  vec2 across = vec2(uAlong.y, -uAlong.x);
  vec2 q = vec2(dot(p, across), dot(p, uAlong)) * uScale + uSeed * vec2(3.7, 1.9);
  vec2 bend = vec2(
    gradientNoise(q * vec2(0.45, 0.28) + vec2(0.0, t * 0.05)),
    gradientNoise(q * vec2(0.45, 0.28) + vec2(5.2, -t * 0.04))
  );
  q += bend * uWarp * 1.6;
  float h = sin(q.x * 2.4 + sin(q.y * 0.7 + t * 0.21) * 1.1 + t * 0.35) * 0.6;
  h += sin(q.x * 3.9 - q.y * 0.9 + t * 0.27 + 1.7) * 0.3;
  h += sin(q.x * 6.7 + q.y * 1.6 - t * 0.43 + 4.1) * 0.12 * uDetail;
  h += gradientNoise(q * vec2(1.2, 0.6) + vec2(t * 0.06, 0.0)) * 0.35 * uDetail;
  h *= uDepth;

  vec2 m = p - uSwell.xy;
  h += uSwell.z * exp(-dot(m, m) / max(uSwellRadius * uSwellRadius, 1e-4));

  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    float r = length(p - ripple.xy);
    float offset = r - ripple.z;
    float band = exp(-offset * offset / 0.0035);
    h += sin(offset * 42.0) * band * ripple.w * 0.12;
  }
  return h;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float e = 1.5 / max(uResolution.y, 1.0);
  float h0 = surface(p);
  float hx = surface(p + vec2(e, 0.0));
  float hy = surface(p + vec2(0.0, e));
  vec2 slope = vec2(hx - h0, hy - h0) / e;
  vec3 normal = normalize(vec3(-slope * 0.32, 1.0));

  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 halfway = normalize(uLight + view);
  float facing = max(dot(normal, uLight), 0.0);
  float spec = pow(max(dot(normal, halfway), 0.0), uGloss);
  float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.2);

  float t = uTime;
  vec2 drift = p * 0.9 + vec2(t * 0.03, -t * 0.02) + uSeed * 2.3;
  float tint = smoothstep(-0.25, 0.45, gradientNoise(drift) + 0.35 * gradientNoise(drift * 2.1 + 3.3));

  float valley = smoothstep(-1.1, 0.9, h0 / max(uDepth, 0.05));
  float light = pow(facing, 1.6) * mix(0.45, 1.0, valley);
  vec3 body = mix(uBody, mix(uBody, uSheen, 0.3), tint * 0.5);
  vec3 color = mix(uShadow, body, light);
  vec3 lift = uSheen * rim * uSheenStrength * 0.6 * light;
  color = 1.0 - (1.0 - color) * (1.0 - clamp(lift, 0.0, 1.0));

  vec3 glint = mix(uSheen, vec3(1.0), 0.75);
  float shine = clamp(spec * uHighlight, 0.0, 1.0);
  color = 1.0 - (1.0 - color) * (1.0 - glint * shine);

  gl_FragColor = linearToOutputTexel(vec4(max(color, 0.0), 1.0));
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor.rgb += (dither - 0.5) / 255.0;
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const readColor = (target: THREE.Color, value: string, fallback: string) => {
  const trimmed = value.trim();
  try {
    target.set(
      /^#[0-9a-f]{8}$/i.test(trimmed) ? trimmed.slice(0, 7) : trimmed,
    );
  } catch {
    target.set(fallback);
  }
  return target;
};

const subscribeToDpr = (notify: () => void) => {
  const media = window.matchMedia("(min-resolution: 2dppx)");
  media.addEventListener("change", notify);
  window.addEventListener("resize", notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("resize", notify);
  };
};

const readDpr = () =>
  typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface PointerInput {
  x: number;
  y: number;
  inside: boolean;
  presses: number;
  pressX: number;
  pressY: number;
}

interface SatinSettings {
  colors: string[];
  backgroundColor: string;
  angle: number;
  scale: number;
  depth: number;
  warp: number;
  detail: number;
  gloss: number;
  highlight: number;
  sheen: number;
  lightAngle: number;
  flow: number;
  speed: number;
  interactive: boolean;
  swell: number;
  swellRadius: number;
  clickRipples: boolean;
  seed: number;
  paused: boolean;
  reduced: boolean;
}

interface SatinSceneProps {
  settings: SatinSettings;
  pointerRef: MutableRefObject<PointerInput>;
  wakeRef: MutableRefObject<(() => void) | null>;
}

interface Motion {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lift: number;
  seeded: boolean;
  presses: number;
  ripples: { x: number; y: number; age: number }[];
  next: number;
}

const createUniforms = () => ({
  uResolution: { value: new THREE.Vector2(1, 1) },
  uTime: { value: 0 },
  uShadow: { value: new THREE.Color() },
  uBody: { value: new THREE.Color() },
  uSheen: { value: new THREE.Color() },
  uAlong: { value: new THREE.Vector2(0, 1) },
  uScale: { value: 2.4 },
  uDepth: { value: 1 },
  uWarp: { value: 1 },
  uDetail: { value: 1 },
  uGloss: { value: 90 },
  uHighlight: { value: 1 },
  uSheenStrength: { value: 0.5 },
  uLight: { value: new THREE.Vector3(0, 0.5, 0.86) },
  uSeed: { value: 0 },
  uSwell: { value: new THREE.Vector3(0, 0, 0) },
  uSwellRadius: { value: 0.22 },
  uRipple: {
    value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()),
  },
});

type SatinUniforms = ReturnType<typeof createUniforms>;

const SatinScene = ({ settings, pointerRef, wakeRef }: SatinSceneProps) => {
  const { size, invalidate } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const motionRef = useRef<Motion>({
    time: 6,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lift: 0,
    seeded: false,
    presses: 0,
    ripples: Array.from({ length: MAX_RIPPLES }, () => ({
      x: 0,
      y: 0,
      age: 99,
    })),
    next: 0,
  });
  const uniforms = useMemo(() => createUniforms(), []);
  const [body, sheen] = settings.colors;
  const { backgroundColor } = settings;

  useEffect(() => {
    wakeRef.current = invalidate;
    return () => {
      wakeRef.current = null;
    };
  }, [invalidate, wakeRef]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    const values = material.uniforms as unknown as SatinUniforms;
    readColor(values.uBody.value, body ?? DEFAULT_COLORS[0], DEFAULT_COLORS[0]);
    readColor(values.uSheen.value, sheen ?? body ?? DEFAULT_COLORS[1], DEFAULT_COLORS[1]);
    readColor(values.uShadow.value, backgroundColor, "#0a0a0a");
    invalidate();
  }, [body, sheen, backgroundColor, invalidate]);

  useEffect(() => {
    invalidate();
  }, [settings, size, invalidate]);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const values = material.uniforms as unknown as SatinUniforms;
    const motion = motionRef.current;
    const s = settings;
    const input = pointerRef.current;
    const dt = Math.min(Math.max(delta, 0), 0.05);
    const animate = !s.paused && !s.reduced && s.speed > 0;
    if (animate) motion.time += dt * clamp(s.speed, 0, 4) * clamp(s.flow, 0, 4);
    const aspect = size.width / Math.max(size.height, 1);

    const tracking = s.interactive && !s.reduced && input.inside;
    const targetX = (input.x - 0.5) * aspect;
    const targetY = input.y - 0.5;
    if (tracking && !motion.seeded) {
      motion.x = targetX;
      motion.y = targetY;
      motion.seeded = true;
    }
    const stiffness = 38;
    const damping = 2 * Math.sqrt(stiffness) * 0.9;
    motion.vx += ((targetX - motion.x) * stiffness - motion.vx * damping) * dt;
    motion.vy += ((targetY - motion.y) * stiffness - motion.vy * damping) * dt;
    motion.x += motion.vx * dt;
    motion.y += motion.vy * dt;
    const liftTarget = tracking ? 1 : 0;
    motion.lift +=
      (liftTarget - motion.lift) *
      (1 - Math.exp(-dt * (liftTarget > motion.lift ? 3.2 : 1.8)));
    if (!tracking && motion.lift < 0.002) motion.seeded = false;

    if (input.presses !== motion.presses) {
      const fresh = Math.min(input.presses - motion.presses, MAX_RIPPLES);
      motion.presses = input.presses;
      if (s.clickRipples && !s.reduced) {
        for (let i = 0; i < fresh; i++) {
          const ripple = motion.ripples[motion.next];
          ripple.x = (input.pressX - 0.5) * aspect;
          ripple.y = input.pressY - 0.5;
          ripple.age = 0;
          motion.next = (motion.next + 1) % MAX_RIPPLES;
        }
      }
    }
    let rippling = false;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const ripple = motion.ripples[i];
      if (ripple.age < 4) ripple.age += dt;
      const strength = ripple.age < 4 ? Math.exp(-ripple.age * 1.1) : 0;
      if (strength > 0.002) rippling = true;
      values.uRipple.value[i].set(
        ripple.x,
        ripple.y,
        ripple.age * 0.45,
        strength,
      );
    }

    const direction = toRadians(s.angle);
    values.uAlong.value.set(Math.sin(direction), Math.cos(direction));
    const azimuth = toRadians(s.lightAngle);
    values.uLight.value
      .set(Math.sin(azimuth) * 0.62, Math.cos(azimuth) * 0.62, 0.78)
      .normalize();
    values.uResolution.value.set(
      size.width * state.viewport.dpr,
      size.height * state.viewport.dpr,
    );
    values.uTime.value = motion.time;
    values.uScale.value = 2.4 * clamp(s.scale, 0.2, 5);
    values.uDepth.value = clamp(s.depth, 0, 3);
    values.uWarp.value = clamp(s.warp, 0, 3);
    values.uDetail.value = clamp(s.detail, 0, 2);
    values.uGloss.value = 10 + clamp(s.gloss, 0, 1) * 250;
    values.uHighlight.value = clamp(s.highlight, 0, 3);
    values.uSheenStrength.value = clamp(s.sheen, 0, 2);
    values.uSeed.value = s.seed;
    values.uSwell.value.set(
      motion.x,
      motion.y,
      motion.lift * clamp(s.swell, 0, 3) * 0.45,
    );
    values.uSwellRadius.value = clamp(s.swellRadius, 0.03, 1);

    const settling =
      rippling ||
      (motion.lift > 0.002 && motion.lift < 0.998) ||
      Math.abs(motion.vx) + Math.abs(motion.vy) > 0.0005;
    if (!animate && (settling || tracking)) invalidate();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

export const SatinRidges = ({
  colors = DEFAULT_COLORS,
  backgroundColor = "#050505",
  angle = -20,
  scale = 1,
  depth = 1,
  warp = 1,
  detail = 1,
  gloss = 0.4,
  highlight = 1,
  sheen = 0.5,
  lightAngle = 10,
  flow = 1,
  speed = 1,
  interactive = true,
  swell = 1,
  swellRadius = 0.22,
  clickRipples = true,
  seed = 0,
  paused = false,
  dpr = 1.5,
  className,
  style,
  children,
}: SatinRidgesProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerInput>({
    x: 0.5,
    y: 0.5,
    inside: false,
    presses: 0,
    pressX: 0.5,
    pressY: 0.5,
  });
  const wakeRef = useRef<(() => void) | null>(null);
  const [visible, setVisible] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    readMotion,
    () => false,
  );
  const deviceDpr = useSyncExternalStore(subscribeToDpr, readDpr, () => 1);
  const pixelRatio = Math.min(deviceDpr, Math.max(dpr, 0.5));
  const animated = !paused && !reducedMotion && speed > 0;

  const settings: SatinSettings = {
    colors,
    backgroundColor,
    angle,
    scale,
    depth,
    warp,
    detail,
    gloss,
    highlight,
    sheen,
    lightAngle,
    flow,
    speed,
    interactive,
    swell,
    swellRadius,
    clickRipples,
    seed,
    paused,
    reduced: reducedMotion,
  };

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const locate = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const state = pointerRef.current;
      state.x = (event.clientX - box.left) / Math.max(box.width, 1);
      state.y = 1 - (event.clientY - box.top) / Math.max(box.height, 1);
      state.inside = true;
    };
    const move = (event: PointerEvent) => {
      locate(event);
      wakeRef.current?.();
    };
    const press = (event: PointerEvent) => {
      locate(event);
      const state = pointerRef.current;
      state.pressX = state.x;
      state.pressY = state.y;
      state.presses += 1;
      wakeRef.current?.();
    };
    const leave = (event: PointerEvent) => {
      if (event.type === "pointerup" && event.pointerType === "mouse") return;
      pointerRef.current.inside = false;
      wakeRef.current?.();
    };
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerdown", press, { passive: true });
    node.addEventListener("pointerleave", leave, { passive: true });
    node.addEventListener("pointercancel", leave, { passive: true });
    node.addEventListener("pointerup", leave, { passive: true });
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerdown", press);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("pointercancel", leave);
      node.removeEventListener("pointerup", leave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate overflow-hidden", className)}
      style={{ backgroundColor, ...style }}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <Canvas
          orthographic
          dpr={pixelRatio}
          frameloop={visible && animated ? "always" : "demand"}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "high-performance",
          }}
          style={{ pointerEvents: "none" }}
        >
          <SatinScene
            settings={settings}
            pointerRef={pointerRef}
            wakeRef={wakeRef}
          />
        </Canvas>
      </div>
      {children ? (
        <div className="relative z-10 h-full w-full">{children}</div>
      ) : null}
    </div>
  );
};

export default SatinRidges;
