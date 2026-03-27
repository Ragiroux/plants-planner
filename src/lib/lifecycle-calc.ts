import type { PlantCalendar } from "./plant-utils";
import { weekToDate } from "./calendar-utils";

export const DEFAULT_INDOOR_DAYS = 21;
export const DEFAULT_GERMINATION_DAYS = 10;
const ACCLIMATATION_DAYS = 7;
const MIN_OUTDOOR_DAYS = 14;
const FALLBACK_MATURITY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EffectiveLifecycle {
  dGerm: number | null;
  d1: number | null;
  d2: number | null;
  dAccl: number | null;
  d3: number | null;
}

export interface PhaseTransitionDays {
  acclimationStart: number | null;
  transplantReady: number | null;
  harvestReady: number | null;
}

/**
 * Compute effective lifecycle durations based on sowing type.
 *
 * Cas 1: Native indoor plant (d1 !== null) → split into dGerm + d1, add dAccl from d2
 * Cas 2: Direct-sow started INDOOR → split into dGerm + d1 + dAccl + d3
 * Cas 3: Direct-sow OUTDOOR → single "au potager" segment
 * Cas 4: null/legacy → return originals
 */
export function getEffectiveLifecycleDurations(
  d1: number | null,
  d2: number | null,
  d3: number | null,
  sowingType: "indoor" | "outdoor" | null,
  calendar: PlantCalendar | null,
  defaultIndoorDays: number | null,
  plantedDate?: string | null,
  germinatedAt?: string | null
): EffectiveLifecycle {
  // Cas 1: Plant has native indoor lifecycle (Tomate, Poivron, etc.)
  if (d1 !== null) {
    let germDays = DEFAULT_GERMINATION_DAYS;
    if (germinatedAt && plantedDate) {
      const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
      const germMs = new Date(germinatedAt + "T00:00:00").getTime();
      germDays = Math.max(1, Math.floor((germMs - plantedMs) / DAY_MS));
    }
    // Clamp so d1 (Germé phase) stays >= 1
    germDays = Math.min(germDays, d1 - 1);

    const acclDays = d2 !== null ? Math.min(ACCLIMATATION_DAYS, d2) : ACCLIMATATION_DAYS;
    const d2Remaining = d2 !== null ? Math.max(d2 - acclDays, 0) : null;
    // If no d2, carve acclimatation from d3
    const d3Adjusted = d2 !== null ? d3 : (d3 !== null ? Math.max(d3 - acclDays, 0) : null);

    return {
      dGerm: germDays,
      d1: d1 - germDays,
      d2: d2Remaining,
      dAccl: acclDays,
      d3: d3Adjusted,
    };
  }

  const minIndoorDays = defaultIndoorDays ?? DEFAULT_INDOOR_DAYS;
  const maturityDays =
    calendar?.days_to_maturity_min ?? calendar?.days_to_maturity_max ?? FALLBACK_MATURITY_DAYS;

  // Cas 2: Direct-sow started indoors
  if (sowingType === "indoor") {
    // Dynamic indoor duration: stay inside until outdoor_sow_start
    let indoorDays = minIndoorDays;

    if (plantedDate && calendar?.outdoor_sow_start) {
      const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
      const outdoorDate = weekToDate(calendar.outdoor_sow_start);
      const daysUntilOutdoor = Math.floor((outdoorDate.getTime() - plantedMs) / DAY_MS);
      if (daysUntilOutdoor > indoorDays) {
        indoorDays = daysUntilOutdoor;
      }
    }

    let germDays = DEFAULT_GERMINATION_DAYS;
    if (germinatedAt && plantedDate) {
      const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
      const germMs = new Date(germinatedAt + "T00:00:00").getTime();
      germDays = Math.max(1, Math.floor((germMs - plantedMs) / DAY_MS));
    }
    // Ensure germDays doesn't exceed indoor time minus acclimatation
    const maxGerm = indoorDays - ACCLIMATATION_DAYS - 1;
    germDays = Math.min(germDays, Math.max(maxGerm, 1));

    return {
      dGerm: germDays,
      d1: indoorDays - ACCLIMATATION_DAYS - germDays,
      d2: null,
      dAccl: ACCLIMATATION_DAYS,
      d3: Math.max(maturityDays - indoorDays, MIN_OUTDOOR_DAYS),
    };
  }

  // Cas 3: Direct-sow outdoors
  if (sowingType === "outdoor") {
    return {
      dGerm: null,
      d1: null,
      d2: null,
      dAccl: null,
      d3: maturityDays,
    };
  }

  // Cas 4: null/legacy — return originals
  return { dGerm: null, d1: null, d2: null, dAccl: null, d3: null };
}

/**
 * Compute named phase transition thresholds (in days since planted_date).
 * Used by both dashboard and cron to avoid duplicating threshold logic.
 */
export function getPhaseTransitionDays(
  durations: EffectiveLifecycle
): PhaseTransitionDays {
  const { dGerm, d1, d2, dAccl, d3 } = durations;

  let cursor = 0;
  let acclimationStart: number | null = null;
  let transplantReady: number | null = null;
  let harvestReady: number | null = null;

  if (dGerm !== null) {
    cursor += dGerm;
  }

  if (d1 !== null) {
    cursor += d1;
  }

  if (d2 !== null) {
    cursor += d2;
  }

  if (dAccl !== null) {
    acclimationStart = cursor;
    cursor += dAccl;
  }

  // transplantReady = end of acclimatation (ready for garden)
  if (dGerm !== null || d2 !== null) {
    transplantReady = cursor;
  }

  if (d3 !== null) {
    harvestReady = cursor + d3;
  }

  return { acclimationStart, transplantReady, harvestReady };
}
