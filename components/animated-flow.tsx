"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { useOptionalUserTheme } from "@/components/UserThemeProvider";
import { cn } from "@/lib/utils";

export type FlowVariant =
  | "blue"
  | "purple"
  | "blush"
  | "emerald"
  | "solar"
  | "aurora"
  | "monochrome"
  | "custom"
  | "silk"
  | "abyss";

export interface AnimatedFlowProps {
  className?: string;
  children?: React.ReactNode;
  /** Preset theme variant; defaults to the user's theme color inside `UserThemeProvider`, else "blue" */
  variant?: FlowVariant;
  /** Velocity speed multiplier for fluid motion (default: 1.0) */
  flowSpeed?: number;
  /** Noise density zoom scale (default: 1.15) */
  zoomScale?: number;
  /** Fluid domain warping intensity (default: 2.6) */
  distortionWarp?: number;
  /** Color vibrancy & contrast multiplier (default: 1.35) */
  colorContrast?: number;
  /** Analog film grain noise opacity (0.0 to 1.0, default: 0.35) */
  filmGrain?: number;
  /** Corner dark vignette strength (0.0 to 1.0, auto-adapts by theme if undefined) */
  vignetteStrength?: number;
  /** Rotation angle of the fluid field in degrees (default: 0) */
  rotationAngle?: number;
  /** Array of up to 5 HEX color strings for custom palette */
  colors?: string[];
  /** Individual HEX color stop overrides */
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  color5?: string;
  /** Whether the fluid responds to cursor movement (default: true) */
  interactive?: boolean;
}

/** Variant Color Palettes for Light and Dark Modes */
export const VARIANT_PALETTES: Record<
  Exclude<FlowVariant, "custom">,
  { light: [string, string, string, string, string]; dark: [string, string, string, string, string] }
> = {
  blue: {
    light: ["#ffffff", "#f5faff", "#e6f2fe", "#d0e6fc", "#b6d6f7"],
    dark: ["#05080c", "#0a1018", "#111b29", "#18273a", "#213650"],
  },
  abyss: {
    light: ["#ffffff", "#f6f8ff", "#e8edfd", "#d3dcfa", "#bcc8f3"],
    dark: ["#04060c", "#090c18", "#0f1427", "#161d38", "#20294d"],
  },
  purple: {
    light: ["#ffffff", "#faf7ff", "#f1e9fe", "#e3d4fc", "#d2bdf5"],
    dark: ["#08060c", "#110c18", "#1c1229", "#28193a", "#36224f"],
  },
  blush: {
    light: ["#ffffff", "#fff7fa", "#ffe9f1", "#fcd5e3", "#f5bed3"],
    dark: ["#0b0609", "#160c11", "#24121b", "#341a27", "#4a2536"],
  },
  silk: {
    light: ["#ffffff", "#fff7fd", "#fde9f8", "#f8d5ef", "#efbde3"],
    dark: ["#0b060a", "#160c14", "#241222", "#341a31", "#482443"],
  },
  emerald: {
    light: ["#ffffff", "#f5fdf8", "#e5f8ed", "#cdefdc", "#b2e3c8"],
    dark: ["#050a07", "#0a140f", "#111f18", "#192d23", "#234032"],
  },
  solar: {
    light: ["#ffffff", "#fffaf5", "#fff0e3", "#fde0c9", "#f8cbaa"],
    dark: ["#0c0805", "#18100a", "#271a10", "#382517", "#4d331f"],
  },
  aurora: {
    light: ["#ffffff", "#f4fdfb", "#e3f7f3", "#dcdff9", "#c9c8f2"],
    dark: ["#05090a", "#0a1416", "#0f2022", "#1a1d36", "#262650"],
  },
  monochrome: {
    light: ["#ffffff", "#fafafa", "#f0f0f2", "#e2e3e7", "#d0d2d8"],
    dark: ["#070708", "#0e0e10", "#17171a", "#222226", "#303036"],
  },
};

function subscribeToRootClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/** Converts HEX color string ("#0047ff") to RGB float array ([0, 0.278, 1]) */
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
}

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_scale;
uniform float u_warp;
uniform float u_contrast;
uniform float u_grain;
uniform float u_vignette;
uniform float u_angle;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform vec3 u_color5;

vec2 wp_hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}

float wp_hash1(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float wp_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(dot(wp_hash2(i), f), 
            dot(wp_hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x), 
        mix(dot(wp_hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), 
            dot(wp_hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), 
        u.y);
}

float wp_fbm(vec2 p) {
    float a = 0.55;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
        s += a * wp_noise(p);
        p *= 2.05;
        a *= 0.45;
    }
    return s;
}

vec3 wp_pal(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(c0, c1, smoothstep(0.00, 0.35, t));
    c = mix(c, c2, smoothstep(0.30, 0.65, t));
    c = mix(c, c3, smoothstep(0.60, 0.88, t));
    c = mix(c, c4, smoothstep(0.85, 1.00, t));
    return c;
}

void main() {
    vec2 res = max(u_resolution, vec2(1.0));
    vec2 fc = vec2(gl_FragCoord.x, gl_FragCoord.y);
    vec2 uv = (fc - 0.5 * res) / res.y;

    float rad = u_angle * (3.14159265 / 180.0);
    mat2 rot = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
    uv = rot * uv;

    float sc = u_scale * 0.82;
    float wa = u_warp * 0.75;
    
    // Dynamic Mouse Warp Interaction across canvas
    vec2 mouseUV = (u_mouse - vec2(0.5, 0.5)) * vec2(res.x / res.y, 1.0);
    mouseUV = rot * mouseUV;
    float mouseDist = length(uv - mouseUV);
    float mouseInfluence = smoothstep(0.85, 0.0, mouseDist);
    vec2 mouseWarp = (uv - mouseUV) * mouseInfluence * 0.45;

    // Full-canvas interactive fluid coordinate
    vec2 uvw = uv + mouseWarp + (u_mouse - vec2(0.5, 0.5)) * 0.4;
    
    float ts = u_time * 0.45;
    uvw += 0.07 * vec2(sin(ts + uv.y * 3.8 + uv.x * 2.1), cos(ts * 0.8 + uv.x * 3.8 - uv.y * 2.1));

    vec2 p = uvw * sc + vec2(15.4, 11.2);

    vec2 q = vec2(wp_fbm(p + vec2(0.0, 0.0)), wp_fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(wp_fbm(p + wa * q + vec2(1.7, 9.2)), wp_fbm(p + wa * q + vec2(8.3, 2.8)));
    float f = wp_fbm(p + wa * r);

    float t = 0.42 + f * u_contrast * 1.85;
    float k = t - 0.78;
    if (k > 0.0) { t = 0.78 + k / (1.0 + k * 1.6); }
    t = pow(clamp(t, 0.0, 1.0), 1.15);

    vec3 col = wp_pal(t, u_color1, u_color2, u_color3, u_color4, u_color5);

    float d = length(uv * vec2(0.78, 0.52));
    col *= mix(1.0, 1.0 - smoothstep(0.1, 1.25, d), clamp(u_vignette, 0.0, 1.0));

    float gs = 1500.0 / res.y;
    float g = wp_hash1(floor(fc * gs) + 37.0);
    col += (g - 0.5) * clamp(u_grain, 0.0, 1.0) * 0.34 * (0.22 + dot(col, vec3(0.333)));

    gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;

/**
 * AnimatedFlow
 *
 * A high-performance WebGL domain-warping fluid gradient background component.
 * Features customizable color variants, film grain, noise scale, domain warping, rotation, and light/dark theme switching.
 */
export function AnimatedFlow({
  className,
  children,
  variant: variantProp,
  flowSpeed = 1.0,
  zoomScale = 1.15,
  distortionWarp = 2.6,
  colorContrast = 1.35,
  filmGrain = 0.35,
  vignetteStrength,
  rotationAngle = 0,
  colors,
  color1,
  color2,
  color3,
  color4,
  color5,
  interactive = true,
}: AnimatedFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const userTheme = useOptionalUserTheme();
  const variant = variantProp ?? userTheme?.color ?? "blue";
  // Dark mode is opt-in via a class on <html>, so light is the default.
  const isLightMode = useSyncExternalStore(
    subscribeToRootClass,
    () => !document.documentElement.classList.contains("dark"),
    () => true
  );

  const paletteKey = isLightMode ? "light" : "dark";

  // Resolve palette preset or custom overrides
  const selectedPalette = VARIANT_PALETTES[variant === "custom" ? "blue" : variant][paletteKey];

  const activeColor1 = color1 ?? colors?.[0] ?? selectedPalette[0];
  const activeColor2 = color2 ?? colors?.[1] ?? selectedPalette[1];
  const activeColor3 = color3 ?? colors?.[2] ?? selectedPalette[2];
  const activeColor4 = color4 ?? colors?.[3] ?? selectedPalette[3];
  const activeColor5 = color5 ?? colors?.[4] ?? selectedPalette[4];

  // Default vignette adapts by theme (no dark vignette in light mode)
  const activeVignette = vignetteStrength ?? (isLightMode ? 0.0 : 0.45);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const createShader = (glCtx: WebGLRenderingContext, type: number, source: string) => {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error("Shader compile error:", glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uScale = gl.getUniformLocation(program, "u_scale");
    const uWarp = gl.getUniformLocation(program, "u_warp");
    const uContrast = gl.getUniformLocation(program, "u_contrast");
    const uGrain = gl.getUniformLocation(program, "u_grain");
    const uVignette = gl.getUniformLocation(program, "u_vignette");
    const uAngle = gl.getUniformLocation(program, "u_angle");
    const uColor1 = gl.getUniformLocation(program, "u_color1");
    const uColor2 = gl.getUniformLocation(program, "u_color2");
    const uColor3 = gl.getUniformLocation(program, "u_color3");
    const uColor4 = gl.getUniformLocation(program, "u_color4");
    const uColor5 = gl.getUniformLocation(program, "u_color5");

    let animId: number;
    const startTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };

    window.addEventListener("resize", resize);
    if (interactive) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("touchmove", handlePointerMove, { passive: true });
    }
    resize();

    const render = (now: number) => {
      const elapsedTime = (now - startTime) * 0.001 * flowSpeed;

      // Smooth mouse lerp with high responsiveness
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsedTime);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uScale, zoomScale);
      gl.uniform1f(uWarp, distortionWarp);
      gl.uniform1f(uContrast, colorContrast);
      gl.uniform1f(uGrain, filmGrain);
      gl.uniform1f(uVignette, activeVignette);
      gl.uniform1f(uAngle, rotationAngle);

      const c1 = hexToRgb(activeColor1);
      const c2 = hexToRgb(activeColor2);
      const c3 = hexToRgb(activeColor3);
      const c4 = hexToRgb(activeColor4);
      const c5 = hexToRgb(activeColor5);

      gl.uniform3f(uColor1, c1[0], c1[1], c1[2]);
      gl.uniform3f(uColor2, c2[0], c2[1], c2[2]);
      gl.uniform3f(uColor3, c3[0], c3[1], c3[2]);
      gl.uniform3f(uColor4, c4[0], c4[1], c4[2]);
      gl.uniform3f(uColor5, c5[0], c5[1], c5[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      if (interactive) {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("touchmove", handlePointerMove);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    };
  }, [
    flowSpeed,
    zoomScale,
    distortionWarp,
    colorContrast,
    filmGrain,
    activeVignette,
    rotationAngle,
    activeColor1,
    activeColor2,
    activeColor3,
    activeColor4,
    activeColor5,
    interactive,
  ]);

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[400px] overflow-hidden bg-white dark:bg-black text-slate-900 dark:text-white transition-colors duration-300",
        className
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
}

export default AnimatedFlow;
