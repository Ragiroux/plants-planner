import { describe, it, expect } from "vitest";
import {
  getEffectiveLifecycleDurations,
  getPhaseTransitionDays,
  DEFAULT_INDOOR_DAYS,
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
  // Cas 1: Native indoor plant — returns original values
  it("returns original values when d1 is not null (native indoor plant)", () => {
    const result = getEffectiveLifecycleDurations(28, 14, 60, "indoor", null, null);
    expect(result).toEqual({ d1: 28, d1Accl: null, d2: 14, d3: 60 });
  });

  it("ignores sowingType for native indoor plants", () => {
    const result = getEffectiveLifecycleDurations(28, 14, 60, "outdoor", null, null);
    expect(result).toEqual({ d1: 28, d1Accl: null, d2: 14, d3: 60 });
  });

  // Cas 2: Direct-sow started indoor
  it("synthesizes indoor lifecycle for direct-sow started indoor", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, 21);
    expect(result).toEqual({
      d1: 14, // 21 - 7
      d1Accl: 7,
      d2: null,
      d3: 34, // max(55 - 21, 14)
    });
  });

  it("uses DEFAULT_INDOOR_DAYS when defaultIndoorDays is null", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "indoor", cal, null);
    expect(result.d1).toBe(DEFAULT_INDOOR_DAYS - 7);
    expect(result.d1Accl).toBe(7);
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

  // Cas 3: Direct-sow outdoor
  it("returns single d3 segment for outdoor direct-sow", () => {
    const cal = makeCal({ days_to_maturity_min: 55 });
    const result = getEffectiveLifecycleDurations(null, null, null, "outdoor", cal, 21);
    expect(result).toEqual({
      d1: null,
      d1Accl: null,
      d2: null,
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
    expect(result).toEqual({ d1: null, d1Accl: null, d2: null, d3: null });
  });
});

describe("getPhaseTransitionDays", () => {
  it("returns thresholds for indoor direct-sow lifecycle", () => {
    const result = getPhaseTransitionDays({ d1: 14, d1Accl: 7, d2: null, d3: 34 });
    expect(result).toEqual({
      acclimationStart: 14,
      transplantReady: 21, // 14 + 7
      harvestReady: 55, // 21 + 34
    });
  });

  it("returns thresholds for outdoor direct-sow lifecycle", () => {
    const result = getPhaseTransitionDays({ d1: null, d1Accl: null, d2: null, d3: 55 });
    expect(result).toEqual({
      acclimationStart: null,
      transplantReady: null,
      harvestReady: 55,
    });
  });

  it("returns all nulls when all durations are null", () => {
    const result = getPhaseTransitionDays({ d1: null, d1Accl: null, d2: null, d3: null });
    expect(result).toEqual({
      acclimationStart: null,
      transplantReady: null,
      harvestReady: null,
    });
  });

  it("handles native indoor plant with repiquage", () => {
    const result = getPhaseTransitionDays({ d1: 28, d1Accl: null, d2: 14, d3: 60 });
    expect(result).toEqual({
      acclimationStart: null,
      transplantReady: 42, // 28 + 14
      harvestReady: 102, // 42 + 60
    });
  });
});
