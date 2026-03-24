import { PlantCalendar } from "./plant-utils";

export type Phase =
  | "indoor_sow"
  | "transplant"
  | "outdoor_sow"
  | "garden_transplant"
  | "harvest";

export interface PlantActionRow {
  id: number;
  plantId: number;
  name: string;
  plantedDate: string | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
  frostTolerance: string | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  calendar: PlantCalendar | null;
  repiquageAt: string | null;
  transplantAt: string | null;
  sowingType: "indoor" | "outdoor" | null;
}

export const phaseConfig: Record<Phase, { emoji: string; label: string }> = {
  indoor_sow: { emoji: "🌱", label: "Semis intérieur" },
  transplant: { emoji: "🪴", label: "Repiquage" },
  outdoor_sow: { emoji: "🌿", label: "Semis extérieur" },
  garden_transplant: { emoji: "🏡", label: "Transplantation" },
  harvest: { emoji: "🍅", label: "Récolte" },
};

export const phaseOrder: Phase[] = [
  "indoor_sow",
  "transplant",
  "outdoor_sow",
  "garden_transplant",
  "harvest",
];

export const stepTypeLabels: Record<string, string> = {
  semis_interieur: "Semis intérieur",
  semis_exterieur: "Semis extérieur",
  germination: "Germé",
  repiquage: "Repiquage",
  transplantation: "Transplantation",
  entretien: "Entretien",
  arrosage: "Arrosage",
  fertilisation: "Fertilisation",
  recolte: "Récolte",
};

export function getActivePhases(row: PlantActionRow, week: number): Phase[] {
  const cal = row.calendar;
  if (!cal) return [];
  const phases: Phase[] = [];
  const check = (start: number | null, end: number | null, phase: Phase) => {
    if (start !== null && end !== null && week >= start && week <= end)
      phases.push(phase);
  };
  check(cal.indoor_sow_start, cal.indoor_sow_end, "indoor_sow");
  check(cal.transplant_start, cal.transplant_end, "transplant");
  check(cal.outdoor_sow_start, cal.outdoor_sow_end, "outdoor_sow");
  check(cal.garden_transplant_start, cal.garden_transplant_end, "garden_transplant");
  check(cal.harvest_start, cal.harvest_end, "harvest");
  return phases;
}

// --- Repiquage timing logic ---

export type RepiquageStatus =
  | { status: "no_data" }
  | { status: "growing"; daysSincePlanted: number; daysUntilRepiquage: number }
  | { status: "soon"; daysSincePlanted: number; daysUntilRepiquage: number }
  | { status: "ready"; daysSincePlanted: number; daysUntilRepiquage: number };

export function getRepiquageStatus(
  plantedDate: string | null,
  daysIndoorToRepiquage: number | null,
  today?: Date
): RepiquageStatus {
  if (!plantedDate || !daysIndoorToRepiquage) return { status: "no_data" };

  const todayDate = today ?? new Date();
  const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
  const todayMs = new Date(
    todayDate.toISOString().slice(0, 10) + "T00:00:00"
  ).getTime();
  const repiquageMs =
    plantedMs + daysIndoorToRepiquage * 24 * 60 * 60 * 1000;

  const daysSincePlanted = Math.floor(
    (todayMs - plantedMs) / (24 * 60 * 60 * 1000)
  );
  const daysUntilRepiquage = Math.floor(
    (repiquageMs - todayMs) / (24 * 60 * 60 * 1000)
  );

  if (daysUntilRepiquage > 7) {
    return { status: "growing", daysSincePlanted, daysUntilRepiquage };
  }
  if (daysUntilRepiquage >= 1) {
    return { status: "soon", daysSincePlanted, daysUntilRepiquage };
  }
  return { status: "ready", daysSincePlanted, daysUntilRepiquage };
}

export type PhaseReadiness =
  | { status: "no_data" }
  | { status: "not_ready"; daysUntilReady: number }
  | { status: "soon"; daysUntilReady: number }
  | { status: "ready"; daysUntilReady: number };

export function getPhaseReadiness(
  plantedDate: string | null,
  cumulativeDays: number | null,
  today?: Date
): PhaseReadiness {
  if (!plantedDate || cumulativeDays === null) return { status: "no_data" };

  const todayDate = today ?? new Date();
  const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
  const todayMs = new Date(
    todayDate.toISOString().slice(0, 10) + "T00:00:00"
  ).getTime();
  const readyMs = plantedMs + cumulativeDays * 24 * 60 * 60 * 1000;
  const daysUntilReady = Math.floor(
    (readyMs - todayMs) / (24 * 60 * 60 * 1000)
  );

  if (daysUntilReady > 7) return { status: "not_ready", daysUntilReady };
  if (daysUntilReady >= 1) return { status: "soon", daysUntilReady };
  return { status: "ready", daysUntilReady };
}

export function getSmartActivePhases(
  row: PlantActionRow,
  week: number,
  today?: Date
): Phase[] {
  const phases = getActivePhases(row, week);

  if (!row.plantedDate) return phases;

  const daysToRepiquage = row.daysIndoorToRepiquage;
  const daysToTransplant = row.daysRepiquageToTransplant;
  const daysToHarvest = row.daysTransplantToHarvest;

  // transplant phase: cumulative = daysIndoorToRepiquage
  const transplantIdx = phases.indexOf("transplant");
  if (transplantIdx !== -1 && daysToRepiquage !== null) {
    const readiness = getPhaseReadiness(row.plantedDate, daysToRepiquage, today);
    if (readiness.status === "not_ready") {
      phases.splice(phases.indexOf("transplant"), 1);
    }
  }

  // garden_transplant phase: cumulative = daysIndoorToRepiquage + daysRepiquageToTransplant
  const gardenTransplantIdx = phases.indexOf("garden_transplant");
  if (gardenTransplantIdx !== -1 && daysToRepiquage !== null && daysToTransplant !== null) {
    const cumulative = daysToRepiquage + daysToTransplant;
    const readiness = getPhaseReadiness(row.plantedDate, cumulative, today);
    if (readiness.status === "not_ready") {
      const idx = phases.indexOf("garden_transplant");
      if (idx !== -1) phases.splice(idx, 1);
    }
  }

  // harvest phase: cumulative = daysIndoorToRepiquage + daysRepiquageToTransplant + daysTransplantToHarvest
  const harvestIdx = phases.indexOf("harvest");
  if (harvestIdx !== -1 && daysToRepiquage !== null && daysToTransplant !== null && daysToHarvest !== null) {
    const cumulative = daysToRepiquage + daysToTransplant + daysToHarvest;
    const readiness = getPhaseReadiness(row.plantedDate, cumulative, today);
    if (readiness.status === "not_ready") {
      const idx = phases.indexOf("harvest");
      if (idx !== -1) phases.splice(idx, 1);
    }
  }

  return phases;
}

export function getPhasesStartingNextWeek(row: PlantActionRow, nextWeek: number, today?: Date): Phase[] {
  const cal = row.calendar;
  if (!cal) return [];
  const candidates: Phase[] = [];
  const check = (start: number | null, phase: Phase) => {
    if (start === nextWeek) candidates.push(phase);
  };
  check(cal.indoor_sow_start, "indoor_sow");
  check(cal.transplant_start, "transplant");
  check(cal.outdoor_sow_start, "outdoor_sow");
  check(cal.garden_transplant_start, "garden_transplant");
  check(cal.harvest_start, "harvest");

  if (!row.plantedDate) return candidates;

  const daysToRepiquage = row.daysIndoorToRepiquage;
  const daysToTransplant = row.daysRepiquageToTransplant;
  const daysToHarvest = row.daysTransplantToHarvest;

  return candidates.filter((phase) => {
    if (phase === "transplant" && daysToRepiquage !== null) {
      return getPhaseReadiness(row.plantedDate, daysToRepiquage, today).status !== "not_ready";
    }
    if (phase === "garden_transplant" && daysToRepiquage !== null && daysToTransplant !== null) {
      const cumulative = daysToRepiquage + daysToTransplant;
      return getPhaseReadiness(row.plantedDate, cumulative, today).status !== "not_ready";
    }
    if (phase === "harvest" && daysToRepiquage !== null && daysToTransplant !== null && daysToHarvest !== null) {
      const cumulative = daysToRepiquage + daysToTransplant + daysToHarvest;
      return getPhaseReadiness(row.plantedDate, cumulative, today).status !== "not_ready";
    }
    return true;
  });
}
