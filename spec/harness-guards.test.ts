import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

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
    for (const testid of ["melody-select", "scale-select"]) {
      const el = doc.querySelector(`[data-testid="${testid}"]`);
      if (el) {
        expect(el.tagName, `[data-testid="${testid}"] must be a real <select>, not a styled <div>`).toBe(
          "SELECT",
        );
      }
    }
    const play = doc.querySelector('[data-testid="play-button"]');
    if (play) {
      expect(play.tagName, '[data-testid="play-button"] must be a real <button>').toBe("BUTTON");
    }
  });
});
