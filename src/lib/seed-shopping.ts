export function calculateSeedsNeeded(
  quantity: number,
  germinationRate: number = 0.8
): number {
  return Math.ceil(quantity / germinationRate);
}

export function getOverplantFactor(frostTolerance: string): number {
  switch (frostTolerance) {
    case "hardy":
      return 1.2;
    case "semi_hardy":
      return 1.3;
    case "tender":
      return 1.5;
    default:
      return 1.3;
  }
}

export function estimateSeedPacketPrice(plantName: string): number {
  const n = plantName.toLowerCase();

  if (
    n.includes("tomate") ||
    n.includes("poivron") ||
    n.includes("piment") ||
    n.includes("aubergine")
  ) {
    return 4.5;
  }

  if (
    n.includes("basilic") ||
    n.includes("persil") ||
    n.includes("coriandre") ||
    n.includes("thym") ||
    n.includes("origan") ||
    n.includes("menthe") ||
    n.includes("ciboulette") ||
    n.includes("aneth")
  ) {
    return 3.5;
  }

  if (
    n.includes("carotte") ||
    n.includes("betterave") ||
    n.includes("radis") ||
    n.includes("navet") ||
    n.includes("panais")
  ) {
    return 3.0;
  }

  return 3.5;
}

export const quebecSeedCompanies = [
  { name: "Jardins de l'Écoumène", url: "https://ecoumene.com" },
  { name: "Semences du Patrimoine", url: "https://semences.ca" },
  { name: "La Société des Plantes", url: "https://lasocietedesplantes.com" },
  { name: "Mycoflor", url: "https://mycoflor.com" },
];
