export type StepType =
  | "semis_interieur"
  | "semis_exterieur"
  | "germination"
  | "repiquage"
  | "transplantation"
  | "entretien"
  | "arrosage"
  | "fertilisation"
  | "recolte";

export function computeNextActionDate(
  stepType: StepType,
  plant: {
    days_indoor_to_repiquage: number | null;
    days_repiquage_to_transplant: number | null;
    days_transplant_to_harvest: number | null;
  }
): string | null {
  const now = new Date();

  if (stepType === "recolte") {
    return null;
  }

  if (stepType === "semis_interieur") {
    if (plant.days_indoor_to_repiquage === null) return null;
    const next = new Date(now);
    next.setDate(next.getDate() + plant.days_indoor_to_repiquage);
    return next.toISOString().slice(0, 10);
  }

  if (stepType === "repiquage") {
    if (plant.days_repiquage_to_transplant === null) return null;
    const next = new Date(now);
    next.setDate(next.getDate() + plant.days_repiquage_to_transplant);
    return next.toISOString().slice(0, 10);
  }

  if (stepType === "transplantation") {
    if (plant.days_transplant_to_harvest === null) return null;
    const next = new Date(now);
    next.setDate(next.getDate() + plant.days_transplant_to_harvest);
    return next.toISOString().slice(0, 10);
  }

  if (stepType === "germination") {
    return null; // No repeat — one-time event
  }

  // Maintenance steps (arrosage, fertilisation, entretien, semis_exterieur): repeat in 7 days
  const next = new Date(now);
  next.setDate(next.getDate() + 7);
  return next.toISOString().slice(0, 10);
}

export const STEP_TYPE_OPTIONS: StepType[] = [
  "semis_interieur",
  "semis_exterieur",
  "germination",
  "repiquage",
  "transplantation",
  "entretien",
  "arrosage",
  "fertilisation",
  "recolte",
];

export const stepLabels: Record<StepType, string> = {
  arrosage: "💧 Arrosage",
  fertilisation: "🌿 Fertilisation",
  entretien: "🔧 Entretien",
  germination: "🌿 Germé",
  repiquage: "🪴 Repiquage",
  transplantation: "🏡 Transplantation au potager",
  semis_interieur: "🌱 Semis intérieur",
  semis_exterieur: "🌿 Semis extérieur",
  recolte: "🍅 Récolte",
};

export function stepObservationContent(
  stepType: StepType,
  plantName: string,
  varietyName?: string
): string {
  const name = varietyName ? `${plantName} (${varietyName})` : plantName;
  return `${stepLabels[stepType]} — ${name}`;
}
