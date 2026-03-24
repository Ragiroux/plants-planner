import type { PlantCalendar } from "./plant-utils";
import { weekToDate } from "./calendar-utils";

export const DEFAULT_INDOOR_DAYS = 21;
const ACCLIMATATION_DAYS = 7;
const MIN_OUTDOOR_DAYS = 14;
const FALLBACK_MATURITY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EffectiveLifecycle {
  d1: number | null;
  d1Accl: number | null;
  d2: number | null;
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
 * Cas 1: Native indoor plant (d1 !== null) → return as-is
 * Cas 2: Direct-sow started INDOOR → dynamic duration based on zone calendar
 * Cas 3: Direct-sow OUTDOOR → single "au potager" segment
 * Cas 4: null/legacy → return originals
 *
 * For Cas 2, indoor duration = max(defaultIndoorDays, days until outdoor_sow_start).
 * This ensures the plant stays indoors until the zone calendar says it's safe outside.
 */
export function getEffectiveLifecycleDurations(
  d1: number | null,
  d2: number | null,
  d3: number | null,
  sowingType: "indoor" | "outdoor" | null,
  calendar: PlantCalendar | null,
  defaultIndoorDays: number | null,
  plantedDate?: string | null
): EffectiveLifecycle {
  // Cas 1: Plant has native indoor lifecycle (Tomate, Poivron, etc.)
  if (d1 !== null) {
    return { d1, d1Accl: null, d2, d3 };
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

    return {
      d1: indoorDays - ACCLIMATATION_DAYS,
      d1Accl: ACCLIMATATION_DAYS,
      d2: null,
      d3: Math.max(maturityDays - indoorDays, MIN_OUTDOOR_DAYS),
    };
  }

  // Cas 3: Direct-sow outdoors
  if (sowingType === "outdoor") {
    return {
      d1: null,
      d1Accl: null,
      d2: null,
      d3: maturityDays,
    };
  }

  // Cas 4: null/legacy — return originals
  return { d1: null, d1Accl: null, d2: null, d3: null };
}

/**
 * Compute named phase transition thresholds (in days since planted_date).
 * Used by both dashboard and cron to avoid duplicating threshold logic.
 */
export function getPhaseTransitionDays(
  durations: EffectiveLifecycle
): PhaseTransitionDays {
  const { d1, d1Accl, d2, d3 } = durations;

  let cursor = 0;
  let acclimationStart: number | null = null;
  let transplantReady: number | null = null;
  let harvestReady: number | null = null;

  if (d1 !== null) {
    cursor += d1;
    if (d1Accl !== null) {
      acclimationStart = cursor;
      cursor += d1Accl;
    }
  }

  if (d2 !== null) {
    cursor += d2;
  }

  // transplantReady = end of indoor + acclimatation (or repiquage)
  if (d1 !== null || d2 !== null) {
    transplantReady = cursor;
  }

  if (d3 !== null) {
    harvestReady = cursor + d3;
  }

  return { acclimationStart, transplantReady, harvestReady };
}
