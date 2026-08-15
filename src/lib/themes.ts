// Scale -> visual theme registry. Pure, DOM-free -- same precedent as
// keyboard.ts/waveform.ts. The actual color values applied to the page live
// in src/styles/scale-themes.css, keyed by the same `id` this module hands
// out; the tokens recorded here are a documentation/consistency source of
// truth (and what themes.test.ts checks for completeness), not what gets
// painted. index.astro never branches on scale name -- it only ever asks
// `themeForScale(targetSelect.value)` for an id to stamp onto data-scale-theme.
//
// Cultural/historical rationale for each mapping lives beside the CSS values
// in scale-themes.css (one justification comment per family) and in the
// Stage 6 plan -- not duplicated here.

export interface ThemeTokens {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSecondary: string;
  gridLine: string;
  note: string;
  noteOutline: string;
  wave: string;
  waveGlow: string;
  waveWidth: number;
  keyActiveWhite: string;
  keyActiveBlack: string;
  // Art-direction pass: an elevated-panel fill (presets, controls, playback,
  // keyboard/waveform frames), a general panel border distinct from
  // gridLine's narrower grid-only purpose, a themed box-shadow color, a CSS
  // background-image value (gradient stack) painting the interactive
  // world's decorative texture, and a 0-1 strength dialed down on mobile so
  // texture never crowds small screens.
  surfaceElevated: string;
  border: string;
  shadow: string;
  worldTexture: string;
  textureStrength: number;
  // Art-direction pass 2: a second, bolder decorative layer on top of
  // worldTexture's fine hairline/mist texture. artImage may be a gradient
  // stack (Natural Minor's moon, Melodic Minor's ribbons, Dorian's horizon,
  // Phrygian's lattice, Hijaz's star-motif, Major's phrase-lines) or a
  // url() reference to a bundled SVG asset (Major Pentatonic's mountains,
  // In Sen's sakura branch) -- index.astro never branches on which; both
  // compose through the same --theme-art-* custom properties.
  artImage: string;
  artPosition: string;
  artSize: string;
  artOpacity: number;
  artBlendMode: string;
}

export interface ThemeDefinition {
  id: string; // data-scale-theme attribute value
  family: string; // shared family id -- related scales reuse this, differ in tokens
  tokens: ThemeTokens;
}

// Keyed by the exact scale-name strings used as <option value> in
// index.astro's Target style <select> (and as keys into scales.ts's SCALES).
export const SCALE_THEMES: Record<string, ThemeDefinition> = {
  Major: {
    id: "major",
    family: "western-tonal-light",
    tokens: {
      bg: "#fdf9f0",
      surface: "#ffffff",
      text: "#2a2410",
      muted: "#7d7250",
      accent: "#c9a227",
      accentSecondary: "#e8dcae",
      gridLine: "#e4dcc0",
      note: "#c9a227",
      noteOutline: "#8a6d1a",
      wave: "#b8860b",
      waveGlow: "rgba(184,134,11,0.35)",
      waveWidth: 2,
      keyActiveWhite: "#f3e6b8",
      keyActiveBlack: "#c9a227",
      surfaceElevated: "#fffefa",
      border: "#e8dcae",
      shadow: "rgba(180,150,80,0.18)",
      worldTexture:
        "repeating-linear-gradient(0deg, rgba(201,162,39,0.05) 0px, rgba(201,162,39,0.05) 1px, transparent 1px, transparent 24px)",
      textureStrength: 0.6,
      artImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cpath d='M0,140 C150,40 300,220 450,110 C600,20 700,160 800,90' fill='none' stroke='%23c9a227' stroke-width='2' opacity='0.8'/%3E%3Cpath d='M0,280 C180,340 320,200 480,300 C620,380 700,260 800,320' fill='none' stroke='%23c9a227' stroke-width='1.5' opacity='0.6'/%3E%3C/svg%3E\")",
      artPosition: "center",
      artSize: "cover",
      artOpacity: 0.5,
      artBlendMode: "normal",
    },
  },
  "Natural Minor": {
    id: "natural-minor",
    family: "western-minor",
    tokens: {
      bg: "#1c2230",
      surface: "#232a3a",
      text: "#e6e9f0",
      muted: "#9aa3b8",
      accent: "#8fa3c7",
      accentSecondary: "#4a5568",
      gridLine: "#3a4256",
      note: "#8fa3c7",
      noteOutline: "#5b7099",
      wave: "#b8c4dc",
      waveGlow: "rgba(143,163,199,0.4)",
      waveWidth: 2,
      keyActiveWhite: "#cdd8ea",
      keyActiveBlack: "#8fa3c7",
      surfaceElevated: "#2a3244",
      border: "#3a4256",
      shadow: "rgba(0,0,0,0.35)",
      worldTexture:
        "repeating-linear-gradient(0deg, rgba(143,163,199,0.05) 0px, rgba(143,163,199,0.05) 1px, transparent 1px, transparent 24px)",
      textureStrength: 0.5,
      artImage:
        "radial-gradient(circle, #eef1fa 0%, #c7d2e8 45%, transparent 72%), radial-gradient(circle, rgba(200,212,235,0.35) 0%, transparent 60%), radial-gradient(ellipse, rgba(230,233,240,0.35), transparent 70%)",
      artPosition: "calc(100% - 2rem) 2rem, calc(100% - 2rem) 2rem, calc(100% - 7rem) 5rem",
      artSize: "220px 220px, 380px 380px, 160px 45px",
      artOpacity: 0.85,
      artBlendMode: "normal",
    },
  },
  "Harmonic Minor": {
    id: "harmonic-minor",
    family: "western-minor",
    tokens: {
      bg: "#14100f",
      surface: "#1f1613",
      text: "#f2e6d8",
      muted: "#a8887a",
      accent: "#b3273e",
      accentSecondary: "#d4a24e",
      gridLine: "#3a2620",
      note: "#b3273e",
      noteOutline: "#7a1626",
      wave: "#d4a24e",
      waveGlow: "rgba(179,39,62,0.5)",
      waveWidth: 2.5,
      keyActiveWhite: "#e8b8be",
      keyActiveBlack: "#b3273e",
      surfaceElevated: "#241a16",
      border: "#4a2f28",
      shadow: "rgba(179,39,62,0.35)",
      worldTexture:
        "radial-gradient(ellipse at 50% 30%, rgba(212,162,78,0.08), transparent 60%), radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
      textureStrength: 0.8,
      artImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 300'%3E%3Cpath d='M0,20 C100,5 200,35 300,20 C400,5 500,35 600,20 C700,5 800,35 900,20 C1000,5 1100,35 1200,20' fill='none' stroke='%23d4a24e' stroke-width='2' opacity='0.55'/%3E%3Cpath d='M0,280 C100,295 200,265 300,280 C400,295 500,265 600,280 C700,295 800,265 900,280 C1000,295 1100,265 1200,280' fill='none' stroke='%23d4a24e' stroke-width='2' opacity='0.55'/%3E%3C/svg%3E\"), linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 15%), linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 15%)",
      artPosition: "center, center, center",
      artSize: "100% 100%, 100% 100%, 100% 100%",
      artOpacity: 0.7,
      artBlendMode: "normal",
    },
  },
  "Melodic Minor (ascending)": {
    id: "melodic-minor",
    family: "western-minor",
    tokens: {
      bg: "#1b1c2b",
      surface: "#232438",
      text: "#e6e4f2",
      muted: "#9694b0",
      accent: "#8b7fc7",
      accentSecondary: "#5a5480",
      gridLine: "#333350",
      note: "#8b7fc7",
      noteOutline: "#5e5490",
      wave: "#a89bd9",
      waveGlow: "rgba(139,127,199,0.4)",
      waveWidth: 1.75,
      keyActiveWhite: "#cec6ea",
      keyActiveBlack: "#8b7fc7",
      surfaceElevated: "#282a42",
      border: "#3d3d5c",
      shadow: "rgba(139,127,199,0.3)",
      worldTexture:
        "radial-gradient(circle at 30% 20%, rgba(139,127,199,0.12), transparent 55%), radial-gradient(circle at 75% 80%, rgba(90,84,128,0.12), transparent 55%)",
      textureStrength: 0.55,
      artImage:
        "linear-gradient(125deg, transparent 0%, rgba(139,127,199,0.35) 15%, transparent 35%), linear-gradient(115deg, transparent 20%, rgba(168,155,217,0.3) 38%, transparent 58%), linear-gradient(135deg, transparent 45%, rgba(90,84,128,0.28) 62%, transparent 82%)",
      artPosition: "center, center, center",
      artSize: "100% 100%, 100% 100%, 100% 100%",
      artOpacity: 0.55,
      artBlendMode: "normal",
    },
  },
  Dorian: {
    id: "dorian",
    family: "western-modal",
    tokens: {
      bg: "#24312a",
      surface: "#2c3a32",
      text: "#e4ede6",
      muted: "#9db3a4",
      accent: "#6fae8c",
      accentSecondary: "#3f5548",
      gridLine: "#3d4f43",
      note: "#6fae8c",
      noteOutline: "#487a5e",
      wave: "#8ecfae",
      waveGlow: "rgba(111,174,140,0.35)",
      waveWidth: 2,
      keyActiveWhite: "#bfe0cc",
      keyActiveBlack: "#6fae8c",
      surfaceElevated: "#33423a",
      border: "#3f5548",
      shadow: "rgba(0,0,0,0.25)",
      worldTexture:
        "repeating-linear-gradient(0deg, rgba(111,174,140,0.06) 0px, rgba(111,174,140,0.06) 1px, transparent 1px, transparent 22px)",
      textureStrength: 0.5,
      artImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'%3E%3Cpath d='M0,140 C150,100 300,160 450,120 C600,80 750,150 900,110 C1000,85 1100,130 1200,100 L1200,200 L0,200 Z' fill='%236fae8c'/%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cpath d='M10,110 C10,70 30,40 60,25 C55,55 45,80 20,100' fill='none' stroke='%233f5548' stroke-width='3' opacity='0.5'/%3E%3Cpath d='M60,25 C75,45 80,70 70,95' fill='none' stroke='%233f5548' stroke-width='3' opacity='0.5'/%3E%3C/svg%3E\")",
      artPosition: "bottom center, top left",
      artSize: "100% 30%, 130px 130px",
      artOpacity: 0.6,
      artBlendMode: "normal",
    },
  },
  Phrygian: {
    id: "phrygian",
    family: "western-modal",
    tokens: {
      bg: "#1f1512",
      surface: "#2a1c17",
      text: "#f0e2da",
      muted: "#ab8a7c",
      accent: "#a63d2e",
      accentSecondary: "#5a4030",
      gridLine: "#3d2b23",
      note: "#a63d2e",
      noteOutline: "#6e2419",
      wave: "#c65a44",
      waveGlow: "rgba(166,61,46,0.45)",
      waveWidth: 2.25,
      keyActiveWhite: "#e0b5ab",
      keyActiveBlack: "#a63d2e",
      surfaceElevated: "#301f19",
      border: "#5a4030",
      shadow: "rgba(0,0,0,0.4)",
      worldTexture:
        "repeating-linear-gradient(35deg, rgba(166,61,46,0.07) 0px, rgba(166,61,46,0.07) 1px, transparent 1px, transparent 18px), radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)",
      textureStrength: 0.65,
      artImage: "repeating-conic-gradient(from 45deg, rgba(166,61,46,0.4) 0deg 6deg, transparent 6deg 30deg)",
      artPosition: "center",
      artSize: "100% 100%",
      artOpacity: 0.5,
      artBlendMode: "normal",
    },
  },
  Hijaz: {
    id: "hijaz",
    family: "hijaz",
    tokens: {
      bg: "#14141f",
      surface: "#1e1e30",
      text: "#f5e6c8",
      muted: "#b89f74",
      accent: "#d9a441",
      accentSecondary: "#8f2d2d",
      gridLine: "#3a3550",
      note: "#d9a441",
      noteOutline: "#a67722",
      wave: "#e6b85c",
      waveGlow: "rgba(217,164,65,0.45)",
      waveWidth: 2,
      keyActiveWhite: "#f0d9a8",
      keyActiveBlack: "#d9a441",
      surfaceElevated: "#242440",
      border: "#4a3f66",
      shadow: "rgba(217,164,65,0.3)",
      worldTexture:
        "repeating-linear-gradient(45deg, rgba(217,164,65,0.06) 0px, rgba(217,164,65,0.06) 2px, transparent 2px, transparent 26px), repeating-linear-gradient(-45deg, rgba(217,164,65,0.06) 0px, rgba(217,164,65,0.06) 2px, transparent 2px, transparent 26px)",
      textureStrength: 0.7,
      artImage: "repeating-conic-gradient(from 0deg, rgba(217,164,65,0.55) 0deg 5deg, transparent 5deg 22.5deg)",
      artPosition: "center",
      artSize: "100% 100%",
      artOpacity: 0.6,
      artBlendMode: "normal",
    },
  },
  "Major Pentatonic": {
    id: "major-pentatonic",
    family: "chinese-ink",
    tokens: {
      bg: "#f2ede4",
      surface: "#faf7f0",
      text: "#2b2b2b",
      muted: "#6b6b6b",
      accent: "#8a1f1f",
      accentSecondary: "#cfcabd",
      gridLine: "#ddd6c7",
      note: "#3a3a3a",
      noteOutline: "#8a1f1f",
      wave: "#3a3a3a",
      waveGlow: "rgba(58,58,58,0.25)",
      waveWidth: 2.5,
      keyActiveWhite: "#e8c9c0",
      keyActiveBlack: "#8a1f1f",
      surfaceElevated: "#fffdf8",
      border: "#ddd6c7",
      shadow: "rgba(58,58,58,0.15)",
      worldTexture:
        "radial-gradient(ellipse 60% 40% at 20% 15%, rgba(58,58,58,0.06), transparent 60%), radial-gradient(ellipse 50% 35% at 80% 70%, rgba(58,58,58,0.05), transparent 65%)",
      textureStrength: 0.5,
      artImage: 'url("../assets/art/major-pentatonic-mountains.svg")',
      artPosition: "bottom center",
      artSize: "120% auto",
      artOpacity: 0.85,
      artBlendMode: "multiply",
    },
  },
  "In Sen": {
    id: "in-sen",
    family: "japanese-ink",
    tokens: {
      bg: "#f4f1ec",
      surface: "#faf8f4",
      text: "#2c2a28",
      muted: "#77726b",
      accent: "#c98a99",
      accentSecondary: "#d8d3ca",
      gridLine: "#ded7cb",
      note: "#3a3733",
      noteOutline: "#c98a99",
      wave: "#4a4642",
      waveGlow: "rgba(201,138,153,0.2)",
      waveWidth: 1.5,
      keyActiveWhite: "#ecd9de",
      keyActiveBlack: "#c98a99",
      surfaceElevated: "#fffefb",
      border: "#ded7cb",
      shadow: "rgba(74,70,66,0.12)",
      worldTexture: "radial-gradient(ellipse 55% 40% at 75% 20%, rgba(74,70,66,0.045), transparent 65%)",
      textureStrength: 0.35,
      artImage: 'url("../assets/art/in-sen-sakura-branch.svg")',
      artPosition: "top right",
      artSize: "30vw auto",
      artOpacity: 0.9,
      artBlendMode: "normal",
    },
  },
};

export function themeForScale(scaleName: string): ThemeDefinition {
  const theme = SCALE_THEMES[scaleName];
  if (!theme) throw new Error(`no theme defined for scale: "${scaleName}"`);
  return theme;
}
