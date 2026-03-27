import { Phase, RepiquageStatus } from "./phase-utils";

export interface TipContext {
  name: string;
  plantedDate: string | null;
  daysIndoorToRepiquage: number | null;
  frostTolerance: string | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  germinationTempMin: number | null;
  germinationTempMax: number | null;
  depthMm: number | null;
  sowingMethod: string | null;
  heightCm: number | null;
  daysToMaturityMin: number | null;
  daysToMaturityMax: number | null;
  sowingType: "indoor" | "outdoor" | null;
  germinatedAt: string | null;
}

const sowingMethodLabels: Record<string, string> = {
  surface: "Semez en surface, ne pas couvrir",
  poquet: "Semez en poquet (2-3 graines par trou)",
  ligne: "Semez en ligne continue",
  volee: "Semez à la volée",
};

function pluriel(n: number): string {
  return n !== 1 ? "s" : "";
}

function indoorSowTip(ctx: TipContext, status: RepiquageStatus): string {
  const daysSincePlanted =
    status.status !== "no_data" ? status.daysSincePlanted : null;

  // Post-germination tips
  if (ctx.germinatedAt) {
    const germinatedMs = new Date(ctx.germinatedAt + "T00:00:00").getTime();
    const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
    const daysSinceGermination = Math.floor((todayMs - germinatedMs) / (24 * 60 * 60 * 1000));

    if (status.status === "soon" || status.status === "ready") {
      return "Repiquage bientôt! Préparez des pots plus grands";
    }

    if (daysSinceGermination <= 7) {
      return "Germé! Gardez un bon éclairage — 14-16h de lumière par jour";
    }

    if (ctx.daysIndoorToRepiquage !== null) {
      return "Semis en croissance — préparez le repiquage";
    }

    return "Gardez un bon éclairage — ces semis ont besoin de lumière directe";
  }

  const isIndoorDirectSow = ctx.sowingType === "indoor" && ctx.daysIndoorToRepiquage === null;

  if (isIndoorDirectSow) {
    if (daysSincePlanted !== null && daysSincePlanted <= 3) {
      if (ctx.germinationTempMin && ctx.germinationTempMax) {
        return `Maintenez ${ctx.germinationTempMin}–${ctx.germinationTempMax}°C pour une germination optimale`;
      }
      return "Gardez un bon éclairage — ces semis ont besoin de lumière directe";
    }
    if (daysSincePlanted !== null && daysSincePlanted > 3) {
      return "Gardez un bon éclairage — ces semis ont besoin de lumière directe";
    }
    return "Semis intérieur en cours";
  }

  if (status.status === "soon") {
    return "Repiquage bientôt! Préparez des pots plus grands";
  }

  if (daysSincePlanted !== null && daysSincePlanted <= 3) {
    if (ctx.germinationTempMin && ctx.germinationTempMax) {
      return `Maintenez ${ctx.germinationTempMin}–${ctx.germinationTempMax}°C pour une germination optimale`;
    }
    if (ctx.depthMm) {
      return `Semez à ${ctx.depthMm}mm de profondeur`;
    }
  }

  if (daysSincePlanted !== null && daysSincePlanted >= 4 && daysSincePlanted <= 14) {
    if (status.status === "growing") {
      return `Semé il y a ${daysSincePlanted} jour${pluriel(daysSincePlanted)} — patience, la germination prend du temps`;
    }
  }

  if (daysSincePlanted !== null && daysSincePlanted > 14) {
    if (status.status === "growing") {
      return `Semé il y a ${daysSincePlanted} jour${pluriel(daysSincePlanted)} — les semis devraient être visibles`;
    }
  }

  return "Semis intérieur en cours";
}

function transplantTip(status: RepiquageStatus): string {
  if (status.status === "ready") {
    if (status.daysUntilRepiquage < 0) {
      const retard = Math.abs(status.daysUntilRepiquage);
      return `En retard de ${retard} jour${pluriel(retard)}! Repiquez dès que possible`;
    }
    return "Prêt à repiquer aujourd'hui!";
  }

  if (status.status === "soon") {
    if (status.daysUntilRepiquage <= 3) {
      return "C'est presque le moment! Manipulez par les feuilles, jamais la tige";
    }
    return `Repiquage dans ${status.daysUntilRepiquage} jour${pluriel(status.daysUntilRepiquage)} — assurez-vous d'avoir des pots prêts`;
  }

  return "Période de repiquage — vérifiez vos semis";
}

function outdoorSowTip(ctx: TipContext): string {
  if (ctx.frostTolerance === "tender") {
    return "Attention au gel tardif! Vérifiez les prévisions nocturnes";
  }
  if (ctx.frostTolerance === "hardy") {
    return "Tolérant au froid — semez sans inquiétude";
  }
  if (ctx.depthMm) {
    const spacing = ctx.spacingCm ? `, espacement: ${ctx.spacingCm}cm` : "";
    return `Profondeur: ${ctx.depthMm}mm${spacing}`;
  }
  if (ctx.sowingMethod && sowingMethodLabels[ctx.sowingMethod]) {
    return sowingMethodLabels[ctx.sowingMethod];
  }
  return "Semis extérieur en cours";
}

function gardenTransplantTip(ctx: TipContext): string {
  if (ctx.frostTolerance === "tender") {
    return "Sensible au gel — surveillez les nuits fraîches";
  }
  if (ctx.spacingCm) {
    const rowPart = ctx.rowSpacingCm
      ? `, ${ctx.rowSpacingCm}cm entre rangs`
      : "";
    return `Espacement: ${ctx.spacingCm}cm entre plants${rowPart}`;
  }
  return "Arrosez bien après la transplantation";
}

function harvestTip(ctx: TipContext): string {
  if (ctx.daysToMaturityMin && ctx.daysToMaturityMax) {
    return `Maturité: ${ctx.daysToMaturityMin}–${ctx.daysToMaturityMax} jours après semis`;
  }
  if (ctx.heightCm) {
    return `Hauteur attendue: ~${ctx.heightCm}cm`;
  }
  return "Récoltez le matin pour une meilleure fraîcheur";
}

export function generateTip(
  phase: Phase,
  ctx: TipContext,
  status: RepiquageStatus
): string {
  switch (phase) {
    case "indoor_sow":
      return indoorSowTip(ctx, status);
    case "transplant":
      return transplantTip(status);
    case "outdoor_sow":
      return outdoorSowTip(ctx);
    case "garden_transplant":
      return gardenTransplantTip(ctx);
    case "harvest":
      return harvestTip(ctx);
  }
}
