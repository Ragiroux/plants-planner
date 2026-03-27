import { describe, it, expect } from "vitest";
import {
  getEffectiveLifecycleDurations,
  getPhaseTransitionDays,
  DEFAULT_INDOOR_DAYS,
  DEFAULT_GERMINATION_DAYS,
} from "../lifecycle-calc";
import type { PlantCalendar } from "../plant-utils";

function makeCal(overrides?: Partial<PlantCalendar>): PlantCalendar {
  return {
    indoor_sow_start: null,
    indoor_sow_end: null,
    transplant_start: null,
    transplant_end: null,
    outdoor_sow_start: null,
    outdoor_sow_end: null,
    garden_transplant_start: null,
    garden_transplant_end: null,
    harvest_start: null,
    harvest_end: null,
    depth_mm: null,
    germination_temp_min: null,
    germination_temp_max: null,
    sowing_method: null,
    luminosity: null,
    height_cm: null,
    days_to_maturity_min: null,
    days_to_maturity_max: null,
    ...overrides,
  };
}

describe("getEffectiveLifecycleDurations", () => {
  // Cas 1: Native indoor plant — splits dGerm from d1, adds dAccl from d2
  it("splits germination and adds acclimatation for native indoor plant", () => {
    const result = getEffectiveLifecycleDurations(28, 14, 60, "indoor", null, null);
    expect(result).toEqual({
      dGerm: DEFAULT_GERMINATION_DAYS,
      d1: 18, // 28 - 10
      d2: 7,  // 14 - 7
      dAccl: 7,
      d3: 60,
    });
  });

  it("ignores sowingType for native indoor plants", () => {
    const result = getEffectiveLifecycleDurations(28, 14, 60, "outdoor", null, null);
    expect(result).toEqual({
      dGerm: DEFAULT_GERMINATION_DAYS,
      d1: 18,
      d2: 7,
      dAccl: 7,
      d3: 60,
    });
  });

  it("uses actual germinated_at date when available (Cas 1)", () => {
    const result = getEffectiveLifecycleDurations(
      28, 14, 60, "indoor", null, null,
      "2026-03-01", "2026-03-08" // 7 days germination
    );
    expect(result.dGerm).toBe(7);
    expect(result.d1).toBe(21); // 28 - 7
  });

  it("handles d2 smaller than acclimatation days", () => {
    const result = getEffectiveLifecycleDurations(28, 5, 60, "indoor", null, null);
    expect(result.dAccl).toBe(5); // clamped to d2
    expect(result.d2).toBe(0);
  });

  it("carves acclimatation from d3 when d2 is null (native indoor)", () => {
    const result = getEffectiveLifecycleDurations(28, null, 60, "indoor", null, null);
    expect(result.dAccl).toBe(7);
    expect(result.d2).toBeNull();
    expect(result.d3).toBe(53); // 60 - 7
  });

  it("preserves total duration for native indoor (Cas 1)", () => {
    const d1Orig = 42, d2Orig = 21, d3Orig = 60;
    const result = getEffectiveLifecycleDurations(d1Orig, d2Orig, d3Orig, "indoor", null, null);
    const total = (result.dGerm ?? 0) + (result.d1 ?? 0) + (result.d2 ?? 0) + (result.dAccl ?? 0) + (result.d3 ?? 0);
    expect(total).toBe(d1Orig + d2Orig + d3Orig);
  });

  // Cas 2: Direct-sow started indoor
  it("synthesizes indoor lifecycle with germination for direct-sow indoor (no plantedDate)", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21);
    expect(result).toEqual({
      dGerm: DEFAULT_GERMINATION_DAYS,
      d1: 4, // 21 - 7 - 10
      d2: null,
      dAccl: 7,
      d3: 34, // max(55 - 21, 14)
    });
  });

  it("uses dynamic indoor duration based on outdoor_sow_start when planted early", () => {
    const cal = makeCal({ days_to_maturity_min: 55, outdoor_sow_start: 12 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21, "2026-03-24");
    expect(result.dGerm).toBe(DEFAULT_GERMINATION_DAYS);
    expect(result.dAccl).toBe(7);
    expect(result.d2).toBeNull();
    const totalIndoor = (result.dGerm ?? 0) + (result.d1 ?? 0) + (result.dAccl ?? 0);
    expect(totalIndoor).toBeGreaterThan(21);
    expect(totalIndoor).toBeLessThan(50);
  });

  it("uses minimum indoor days when planted close to outdoor window", () => {
    const cal = makeCal({ days_to_maturity_min: 55, outdoor_sow_start: 12 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21, "2026-04-25");
    expect(result.dGerm).toBe(DEFAULT_GERMINATION_DAYS);
    expect(result.d1).toBe(4); // 21 - 7 - 10
    expect(result.dAccl).toBe(7);
  });

  it("uses DEFAULT_INDOOR_DAYS when defaultIndoorDays is null", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, null);
    expect(result.dGerm).toBe(DEFAULT_GERMINATION_DAYS);
    expect(result.d1).toBe(DEFAULT_INDOOR_DAYS - 7 - DEFAULT_GERMINATION_DAYS);
    expect(result.dAccl).toBe(7);
  });

  it("uses fallback 60 days maturity when calendar is null", () => {
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", null, 21);
    expect(result.d3).toBe(Math.max(60 - 21, 14));
  });

  it("floors d3 at 14 days when maturity < defaultIndoorDays", () => {
    const cal = makeCal({ days_to_maturity_min: 10 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21);
    expect(result.d3).toBe(14);
  });

  it("uses days_to_maturity_max as fallback when min is null", () => {
    const cal = makeCal({ days_to_maturity_min: null, days_to_maturity_max: 75 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21);
    expect(result.d3).toBe(Math.max(75 - 21, 14));
  });

  it("uses actual germinated_at for direct-sow indoor (Cas 2)", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(
      null, null, null, "indoor", cal, 21,
      "2026-03-01", "2026-03-06" // 5 days germination
    );
    expect(result.dGerm).toBe(5);
    expect(result.d1).toBe(21 - 7 - 5); // 9
  });

  // Cas 3: Direct-sow outdoor
  it("returns single d3 segment for outdoor direct-sow", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "outdoor", cal, 21);
    expect(result).toEqual({
      dGerm: null,
      d1: null,
      d2: null,
      dAccl: null,
      d3: 55,
    });
  });

  it("uses fallback 60 for outdoor when calendar is null", () => {
    const result = getEffectiveLifecycleDurations(null, null, null, "outdoor", null, null);
    expect(result.d3).toBe(60);
  });

  // Cas 4: null/legacy
  it("returns all nulls when sowingType is null", () => {
    const result = getEffectiveLifecycleDurations(null, null, null, null, null, null);
    expect(result).toEqual({ dGerm: null, d1: null, d2: null, dAccl: null, d3: null });
  });
});

describe("getPhaseTransitionDays", () => {
  it("returns thresholds for indoor direct-sow lifecycle", () => {
    const result = getPhaseTransitionDays({ dGerm: 10, d1: 4, d2: null, dAccl: 7, d3: 34 });
    expect(result).toEqual({
      acclimationStart: 14, // 10 + 4
      transplantReady: 21,  // 10 + 4 + 7
      harvestReady: 55,     // 21 + 34
    });
  });

  it("returns thresholds for outdoor direct-sow lifecycle", () => {
    const result = getPhaseTransitionDays({ dGerm: null, d1: null, d2: null, dAccl: null, d3: 55 });
    expect(result).toEqual({
      acclimationStart: null,
      transplantReady: null,
      harvestReady: 55,
    });
  });

  it("returns all nulls when all durations are null", () => {
    const result = getPhaseTransitionDays({ dGerm: null, d1: null, d2: null, dAccl: null, d3: null });
    expect(result).toEqual({
      acclimationStart: null,
      transplantReady: null,
      harvestReady: null,
    });
  });

  it("handles native indoor plant with repiquage", () => {
    const result = getPhaseTransitionDays({ dGerm: 10, d1: 18, d2: 7, dAccl: 7, d3: 60 });
    expect(result).toEqual({
      acclimationStart: 35, // 10 + 18 + 7
      transplantReady: 42,  // 35 + 7
      harvestReady: 102,    // 42 + 60
    });
  });
});
