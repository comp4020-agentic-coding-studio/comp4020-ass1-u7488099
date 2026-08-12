import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { TWINKLE_TWINKLE } from "../src/lib/melodies.ts";

// Assignment 1 spec (https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-1/):
// "the visitor does something that changes what they see — state the core
// interaction plainly enough to write a test for it."
//
// One Melody, Many Worlds: selecting a different scale remaps the same
// melody's notes. That's a claim about a pure transform, not about DOM
// wiring, so it's tested directly against `transformMelody` rather than by
// simulating a click in jsdom — the UI can be built however you like as long
// as it calls this contract. Rename/relocate freely; keep the property.

describe("scale transform", () => {
  it("remaps the same melody differently under different scales", async () => {
    const modulePath = resolve("src/lib/transform.ts");
    expect(
      existsSync(modulePath),
      `${modulePath} not found. Export transformMelody(melody: Melody, targetScaleName: string): string[] from it, or update this test's import to match where you put it.`,
    ).toBe(true);

    const { transformMelody } = await import("../src/lib/transform.ts");
    // Full melody, not the "do do sol sol la la sol" excerpt — that excerpt
    // never touches re or mi, so it can't show Hijaz and Natural Minor
    // diverging. See melodies.ts.

    const underMajor = transformMelody(TWINKLE_TWINKLE, "Major");
    const underMinor = transformMelody(TWINKLE_TWINKLE, "Natural Minor");

    expect(underMajor).toHaveLength(TWINKLE_TWINKLE.notes.length);
    expect(underMinor).toHaveLength(TWINKLE_TWINKLE.notes.length);
    expect(underMinor).not.toEqual(underMajor);
  });
});

describe("scale transform: UI hooks", () => {
  const distPath = resolve("dist/index.html");

  it("built the page", () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it("exposes a melody selector, a scale selector, and a transformed-notes display", () => {
    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    expect(
      doc.querySelector('[data-testid="melody-select"]'),
      "no [data-testid=\"melody-select\"] — the visitor needs to pick a melody",
    ).toBeTruthy();
    expect(
      doc.querySelector('[data-testid="scale-select"]'),
      "no [data-testid=\"scale-select\"] — the visitor needs to pick a scale",
    ).toBeTruthy();
    expect(
      doc.querySelector('[data-testid="transformed-notes"]'),
      "no [data-testid=\"transformed-notes\"] — where the remapped notes for the current melody+scale show up",
    ).toBeTruthy();
  });
});
