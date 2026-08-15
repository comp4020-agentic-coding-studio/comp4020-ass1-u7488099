import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { SCALE_THEMES } from "../src/lib/themes.ts";

// Guards for the CLAUDE.md project rules that a description alone won't
// catch: no autoplay, no unexpected runtime dependencies, and — once the
// controls exist — real semantic elements rather than styled-div fakes.
// Not a replacement for spec/assignment-1.test.ts, which covers the spec's
// own testable line; this file guards the harness rules layered on top.

describe("no autoplay", () => {
  const distPath = resolve("dist/index.html");

  it("built the page", () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it("never plays audio without a user gesture", () => {
    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    const autoplaying = doc.querySelectorAll("[autoplay]");
    expect(
      autoplaying.length,
      "found an [autoplay] attribute — playback must wait for the Play button",
    ).toBe(0);
  });
});

describe("no unnecessary runtime dependencies", () => {
  it("keeps package.json's dependencies empty", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(
      deps,
      `unexpected runtime dependencies: ${deps.join(", ")} — Web Audio and <select>/<button> are platform-native; ask before adding a library`,
    ).toEqual([]);
  });
});

describe("semantic controls", () => {
  it("uses real <select> and <button> elements for the core interaction, once they exist", () => {
    const distPath = resolve("dist/index.html");
    if (!existsSync(distPath)) return; // covered by the "built the page" check above

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    for (const testid of ["editor-source-select", "editor-target-select"]) {
      const el = doc.querySelector(`[data-testid="${testid}"]`);
      if (el) {
        expect(el.tagName, `[data-testid="${testid}"] must be a real <select>, not a styled <div>`).toBe(
          "SELECT",
        );
      }
    }
    for (const testid of ["editor-play-button", "editor-stop-button"]) {
      const el = doc.querySelector(`[data-testid="${testid}"]`);
      if (el) {
        expect(el.tagName, `[data-testid="${testid}"] must be a real <button>`).toBe("BUTTON");
      }
    }
  });
});

describe("waveform accessibility", () => {
  it("is a real <canvas> with an accessible name, once it exists", () => {
    const distPath = resolve("dist/index.html");
    if (!existsSync(distPath)) return; // covered by the "built the page" check above

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    const canvas = doc.querySelector('[data-testid="editor-waveform"]');
    if (!canvas) return; // this stage may not have shipped yet

    expect(canvas.tagName, '[data-testid="editor-waveform"] must be a real <canvas>').toBe("CANVAS");
    expect(
      canvas.getAttribute("aria-label") || canvas.getAttribute("aria-describedby"),
      "the waveform canvas needs an accessible name/description for non-visual users",
    ).toBeTruthy();
  });
});

// Stage 6: Target style drives a centralized visual theme via a single
// data-scale-theme attribute — this only checks the attribute exists with a
// valid value at build time. Whether it actually *changes* when Target style
// changes, whether Source style alone leaves it alone, and whether all 9
// themes are visually distinguishable/readable are browser/human-judgment
// checks (see the Stage 6 plan), not something a static build artifact can
// prove.
describe("scale theme scope", () => {
  it("stamps .theme-scope with a data-scale-theme value from the theme registry", () => {
    const distPath = resolve("dist/index.html");
    if (!existsSync(distPath)) return; // covered by the "built the page" check above

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    const scope = doc.querySelector('[data-testid="theme-scope"]');
    if (!scope) return; // this stage may not have shipped yet

    const themeId = scope.getAttribute("data-scale-theme");
    const validIds = Object.values(SCALE_THEMES).map((theme) => theme.id);
    expect(themeId, ".theme-scope must have a non-empty data-scale-theme attribute").toBeTruthy();
    expect(validIds, `"${themeId}" is not a known theme id (${validIds.join(", ")})`).toContain(themeId);
  });
});

// Stage 6 redesign: the interactive region (Presets, Source/Target form,
// Playback, Waveform, Keyboard, Composition editor) was pulled inside
// .theme-scope so its *entire* background/chrome responds to Target style,
// not just a handful of inner details -- only the neutral .intro (h1 + intro
// paragraph) stays outside it. This guards the structural move itself: a
// regression that pulls a control back out to sit alongside .intro would
// pass every other check here (still real <select>/<button>) while quietly
// undoing the redesign's whole premise.
describe("interactive region lives inside the theme scope", () => {
  it("keeps Presets, Source/Target selects, and Play/Stop inside .theme-scope", () => {
    const distPath = resolve("dist/index.html");
    if (!existsSync(distPath)) return; // covered by the "built the page" check above

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    const scope = doc.querySelector('[data-testid="theme-scope"]');
    if (!scope) return; // this stage may not have shipped yet

    const testids = [
      "editor-preset-twinkle",
      "editor-preset-joy",
      "editor-preset-moli-hua",
      "editor-clear-button",
      "editor-source-select",
      "editor-target-select",
      "editor-play-button",
      "editor-stop-button",
    ];
    for (const testid of testids) {
      const el = doc.querySelector(`[data-testid="${testid}"]`);
      if (!el) continue; // this stage may not have shipped yet
      expect(scope.contains(el), `[data-testid="${testid}"] must be inside [data-testid="theme-scope"]`).toBe(true);
    }
  });
});

// Art-direction pass 2: Mo Li Hua's piece-title caption is display state
// (activePieceLabel), never scale/theme identity -- it must default to
// hidden so no static build output ever shows it without the click-driven
// script running first.
describe("piece caption defaults hidden", () => {
  it("ships [data-testid=\"piece-caption\"] hidden by default, once it exists", () => {
    const distPath = resolve("dist/index.html");
    if (!existsSync(distPath)) return; // covered by the "built the page" check above

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;
    const caption = doc.querySelector('[data-testid="piece-caption"]');
    if (!caption) return; // this stage may not have shipped yet

    expect(caption.hasAttribute("hidden"), '[data-testid="piece-caption"] must default to hidden').toBe(true);
  });
});
