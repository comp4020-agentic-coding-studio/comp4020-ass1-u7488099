// Scaffold only — no transformation logic yet. Exists so `astro check` can
// resolve the module that spec/assignment-1.test.ts and scales.test.ts
// already reference; the tests stay red, now at runtime with a clear reason
// instead of blocking the whole check chain at typecheck.
export function transformMelody(_notes: string[], scaleName: string): string[] {
  throw new Error(`transformMelody not implemented yet (asked for "${scaleName}")`);
}
