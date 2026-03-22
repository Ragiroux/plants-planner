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
  frostTolerance: string | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  calendar: PlantCalendar | null;
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

export function getSmartActivePhases(
  row: PlantActionRow,
  week: number,
  today?: Date
): Phase[] {
  const phases = getActivePhases(row, week);
  const transplantIdx = phases.indexOf("transplant");
  if (transplantIdx === -1) return phases;

  const status = getRepiquageStatus(
    row.plantedDate,
    row.daysIndoorToRepiquage,
    today
  );

  if (status.status === "growing") {
    phases.splice(transplantIdx, 1);
  }

  return phases;
}

export function getPhasesStartingNextWeek(row: PlantActionRow, nextWeek: number): Phase[] {
  const cal = row.calendar;
  if (!cal) return [];
  const phases: Phase[] = [];
  const check = (start: number | null, phase: Phase) => {
    if (start === nextWeek) phases.push(phase);
  };
  check(cal.indoor_sow_start, "indoor_sow");
  check(cal.transplant_start, "transplant");
  check(cal.outdoor_sow_start, "outdoor_sow");
  check(cal.garden_transplant_start, "garden_transplant");
  check(cal.harvest_start, "harvest");
  return phases;
}
