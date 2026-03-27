export interface PlantCalendar {
  indoor_sow_start: number | null;
  indoor_sow_end: number | null;
  transplant_start: number | null;
  transplant_end: number | null;
  outdoor_sow_start: number | null;
  outdoor_sow_end: number | null;
  garden_transplant_start: number | null;
  garden_transplant_end: number | null;
  harvest_start: number | null;
  harvest_end: number | null;
  depth_mm: number | null;
  germination_temp_min: number | null;
  germination_temp_max: number | null;
  sowing_method: string | null;
  luminosity: string | null;
  height_cm: number | null;
  days_to_maturity_min: number | null;
  days_to_maturity_max: number | null;
}

export function getPlantEmoji(name: string): string {
  const n = name.toLowerCase();
  // Exact/specific matches first (order matters for substring matching)
  if (n.includes("tomatillo")) return "🍅";
  if (n.includes("tomate")) return "🍅";
  if (n.includes("topinambour")) return "🌻";
  if (n.includes("artichaut")) return "🌻";
  if (n.includes("carotte")) return "🥕";
  if (n.includes("panais")) return "🥕";
  if (n.includes("concombre")) return "🥒";
  if (n.includes("courgette")) return "🫒";
  if (n.includes("chou-rave")) return "🫛";
  if (n.includes("chou frisé") || n.includes("kale")) return "🥗";
  if (n.includes("chou marin")) return "🌊";
  if (n.includes("chou")) return "🥬";
  if (n.includes("laitue")) return "🥗";
  if (n.includes("mesclun")) return "🥗";
  if (n.includes("épinard") || n.includes("epinard")) return "🍃";
  if (n.includes("poivron") || n.includes("piment")) return "🌶️";
  if (n.includes("aubergine")) return "🍆";
  if (n.includes("brocoli")) return "🥦";
  if (n.includes("haricot")) return "🫘";
  if (n.includes("soja") || n.includes("édamame") || n.includes("edamame")) return "🫛";
  if (n.includes("pois")) return "🫛";
  if (n.includes("maïs") || n.includes("mais")) return "🌽";
  if (n.includes("échalote") || n.includes("echalote")) return "🧅";
  if (n.includes("oignon")) return "🧅";
  if (n.includes("poireau")) return "🧅";
  if (n.includes("ail")) return "🧄";
  if (n.includes("radis de printemps")) return "🔴";
  if (n.includes("radis d'hiver") || n.includes("radis d'hiver")) return "⚪";
  if (n.includes("radis")) return "🔴";
  if (n.includes("betterave")) return "🟣";
  if (n.includes("navet")) return "🟤";
  if (n.includes("rutabaga")) return "🟡";
  if (n.includes("céleri") || n.includes("celeri")) return "🪹";
  if (n.includes("bette à carde") || n.includes("bette a carde")) return "🌈";
  if (n.includes("citrouille") || n.includes("courge")) return "🎃";
  if (n.includes("melon")) return "🍈";
  if (n.includes("cerise de terre")) return "🫐";
  if (n.includes("morelle") || n.includes("sunberry") || n.includes("balbis")) return "🫐";
  if (n.includes("moutarde") || n.includes("roquette")) return "🌶️";
  if (n.includes("oseille")) return "🍋";
  if (n.includes("rhubarbe")) return "🫙";
  if (n.includes("souchet")) return "🥜";
  if (n.includes("chicorée") || n.includes("chicoree")) return "🥬";
  if (n.includes("arroche")) return "🌿";
  if (n.includes("mâche") || n.includes("mache")) return "🌿";
  if (n.includes("pourpier")) return "🌿";
  if (n.includes("aneth")) return "🌾";
  if (n.includes("ciboulette")) return "💜";
  if (n.includes("coriandre")) return "☘️";
  if (n.includes("camomille")) return "🌼";
  if (n.includes("lavande")) return "💐";
  if (n.includes("livèche") || n.includes("liveche")) return "🌿";
  if (n.includes("marjolaine")) return "🌿";
  if (n.includes("mélisse") || n.includes("melisse")) return "🍃";
  if (n.includes("origan")) return "🌿";
  if (n.includes("sarriette")) return "🌿";
  if (n.includes("sauge")) return "🪻";
  if (n.includes("thym")) return "🫧";
  if (n.includes("bourrache")) return "🔵";
  if (n.includes("cresson")) return "🌱";
  if (n.includes("cerfeuil")) return "🌿";
  if (n.includes("fenouil")) return "🌿";
  if (n.includes("persil")) return "🌿";
  if (n.includes("basilic")) return "🌿";
  return "🌱";
}

export function getStatusLabel(
  calendar: PlantCalendar | null,
  currentWeek: number
): { label: string; bg: string; color: string } {
  if (!calendar) {
    return { label: "Hors saison", bg: "#F5F2EE", color: "#7D766E" };
  }

  if (
    calendar.indoor_sow_start !== null &&
    calendar.indoor_sow_end !== null &&
    currentWeek >= calendar.indoor_sow_start &&
    currentWeek <= calendar.indoor_sow_end
  ) {
    return { label: "Semis intérieur", bg: "#FEF9C3", color: "#92400E" };
  }
  if (
    calendar.transplant_start !== null &&
    calendar.transplant_end !== null &&
    currentWeek >= calendar.transplant_start &&
    currentWeek <= calendar.transplant_end
  ) {
    return { label: "Repiquage", bg: "#FCE7F3", color: "#831843" };
  }
  if (
    calendar.outdoor_sow_start !== null &&
    calendar.outdoor_sow_end !== null &&
    currentWeek >= calendar.outdoor_sow_start &&
    currentWeek <= calendar.outdoor_sow_end
  ) {
    return { label: "Semis extérieur", bg: "#FEFCE8", color: "#713F12" };
  }
  if (
    calendar.garden_transplant_start !== null &&
    calendar.garden_transplant_end !== null &&
    currentWeek >= calendar.garden_transplant_start &&
    currentWeek <= calendar.garden_transplant_end
  ) {
    return { label: "Au potager", bg: "#DCFCE7", color: "#2D5A3D" };
  }
  if (
    calendar.harvest_start !== null &&
    calendar.harvest_end !== null &&
    currentWeek >= calendar.harvest_start &&
    currentWeek <= calendar.harvest_end
  ) {
    return { label: "Récolte", bg: "#FEE2E2", color: "#C0392B" };
  }

  return { label: "Hors saison", bg: "#F5F2EE", color: "#7D766E" };
}
