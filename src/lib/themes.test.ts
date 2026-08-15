import { describe, expect, it } from "vitest";
import { SCALE_THEMES, themeForScale, type ThemeTokens } from "./themes.ts";

// The exact 9 scale-name strings exposed as <option value> in index.astro's
// Target style <select> -- kept as a literal list (rather than importing
// SCALES from scales.ts) so this test catches a theme going missing even if
// scales.ts's catalog and index.astro's options ever drift apart.
const TARGET_SCALE_NAMES = [
  "Major",
  "Natural Minor",
  "Harmonic Minor",
  "Melodic Minor (ascending)",
  "Dorian",
  "Phrygian",
  "Hijaz",
  "Major Pentatonic",
  "In Sen",
];

const EXPECTED_FAMILIES: Record<string, string> = {
  Major: "western-tonal-light",
  "Natural Minor": "western-minor",
  "Harmonic Minor": "western-minor",
  "Melodic Minor (ascending)": "western-minor",
  Dorian: "western-modal",
  Phrygian: "western-modal",
  Hijaz: "hijaz",
  "Major Pentatonic": "chinese-ink",
  "In Sen": "japanese-ink",
};

describe("themeForScale", () => {
  it("resolves every one of the 9 exposed target scales to a complete theme", () => {
    for (const scaleName of TARGET_SCALE_NAMES) {
      const theme = themeForScale(scaleName);
      expect(theme.id, `${scaleName} theme id`).toBeTruthy();
      expect(theme.family, `${scaleName} theme family`).toBeTruthy();

      const tokenKeys: (keyof ThemeTokens)[] = [
        "bg",
        "surface",
        "text",
        "muted",
        "accent",
        "accentSecondary",
        "gridLine",
        "note",
        "noteOutline",
        "wave",
        "waveGlow",
        "waveWidth",
        "keyActiveWhite",
        "keyActiveBlack",
        "surfaceElevated",
        "border",
        "shadow",
        "worldTexture",
        "textureStrength",
        "artImage",
        "artPosition",
        "artSize",
        "artOpacity",
        "artBlendMode",
      ];
      for (const key of tokenKeys) {
        const value = theme.tokens[key];
        expect(value, `${scaleName} token "${key}"`).not.toBe(undefined);
        expect(value, `${scaleName} token "${key}"`).not.toBe("");
      }
    }
  });

  it("throws on an unknown scale name", () => {
    expect(() => themeForScale("Locrian")).toThrow(/no theme defined/);
  });
});

describe("SCALE_THEMES", () => {
  it("gives every one of the 9 exposed target scales a distinct id", () => {
    const ids = TARGET_SCALE_NAMES.map((name) => themeForScale(name).id);
    expect(new Set(ids).size).toBe(TARGET_SCALE_NAMES.length);
  });

  it("groups related scales into the expected shared families", () => {
    for (const scaleName of TARGET_SCALE_NAMES) {
      expect(themeForScale(scaleName).family, scaleName).toBe(EXPECTED_FAMILIES[scaleName]);
    }
  });

  it("defines no scale beyond the 9 exposed target scales unexpectedly missing coverage", () => {
    for (const scaleName of TARGET_SCALE_NAMES) {
      expect(scaleName in SCALE_THEMES, scaleName).toBe(true);
    }
  });
});
