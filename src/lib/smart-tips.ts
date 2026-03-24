export interface SmartTip {
  type: "watering" | "heat" | "frost" | "fertilization";
  icon: string;
  plantName?: string;
  message: string;
  severity: "info" | "warning" | "urgent";
}

export interface SmartTipPlant {
  name: string;
  emoji: string;
  frostTolerance: string | null;
  wateringFreq: string | null;
  isInGarden: boolean;
  lastWatering: Date | null;
  lastFertilization: Date | null;
}

export interface SmartTipWeather {
  forecast: Array<{ day: string; min: number; max: number }>;
  frostWarning: boolean;
}

export interface SmartTipContext {
  plants: SmartTipPlant[];
  weather: SmartTipWeather | null;
  today: Date;
}

const WATERING_INTERVAL_DAYS: Record<string, number> = {
  frequent: 3,
  regular: 5,
  moderate: 7,
  low: 10,
};
const DEFAULT_WATERING_INTERVAL = 7;
const FERTILIZATION_INTERVAL = 14;
const HEAT_THRESHOLD = 30;

const SEVERITY_ORDER: Record<SmartTip["severity"], number> = {
  urgent: 0,
  warning: 1,
  info: 2,
};

export function generateSmartTips(ctx: SmartTipContext): SmartTip[] {
  const tips: SmartTip[] = [];
  const DAY = 24 * 60 * 60 * 1000;
  const todayMs = ctx.today.getTime();

  // 1. Watering tips
  for (const plant of ctx.plants) {
    if (!plant.isInGarden || plant.lastWatering === null) continue;

    const daysSince = Math.floor((todayMs - plant.lastWatering.getTime()) / DAY);
    const interval =
      plant.wateringFreq !== null
        ? (WATERING_INTERVAL_DAYS[plant.wateringFreq] ?? DEFAULT_WATERING_INTERVAL)
        : DEFAULT_WATERING_INTERVAL;

    if (daysSince > interval) {
      tips.push({
        type: "watering",
        icon: "💧",
        plantName: plant.name,
        message: `${plant.name} — Pas d'arrosage depuis ${daysSince} jours`,
        severity: "urgent",
      });
    } else if (daysSince === interval) {
      tips.push({
        type: "watering",
        icon: "💧",
        plantName: plant.name,
        message: `${plant.name} — Arrosage recommandé aujourd'hui`,
        severity: "warning",
      });
    }
  }

  // 2. Heat tips
  if (ctx.weather !== null) {
    const hotDays = ctx.weather.forecast.filter((d) => d.max >= HEAT_THRESHOLD);
    if (hotDays.length > 0) {
      const hottest = hotDays.reduce((a, b) => (b.max > a.max ? b : a));
      tips.push({
        type: "heat",
        icon: "🌡️",
        message: `${hottest.max}°C annoncé ${hottest.day} — Arrosez tôt le matin ou en soirée`,
        severity: "warning",
      });
    }

    // 3. Frost tips
    if (ctx.weather.frostWarning) {
      const coldestMin = ctx.weather.forecast.reduce(
        (min, d) => (d.min < min ? d.min : min),
        ctx.weather.forecast[0]?.min ?? 0
      );

      const tenderPlants = ctx.plants.filter(
        (p) => p.isInGarden && p.frostTolerance === "tender"
      );

      if (tenderPlants.length > 0) {
        const names = tenderPlants.map((p) => p.name).join(", ");
        tips.push({
          type: "frost",
          icon: "❄️",
          message: `Gel prévu (${coldestMin}°C) — Protégez ${names}`,
          severity: "urgent",
        });
      } else {
        tips.push({
          type: "frost",
          icon: "❄️",
          message: `Gel prévu (${coldestMin}°C) — Surveillez vos plants sensibles`,
          severity: "info",
        });
      }
    }
  }

  // 4. Fertilization tips
  for (const plant of ctx.plants) {
    if (!plant.isInGarden || plant.lastFertilization === null) continue;

    const daysSince = Math.floor(
      (todayMs - plant.lastFertilization.getTime()) / DAY
    );

    if (daysSince > FERTILIZATION_INTERVAL) {
      tips.push({
        type: "fertilization",
        icon: "🌿",
        plantName: plant.name,
        message: `${plant.name} — Dernière fertilisation il y a ${daysSince} jours`,
        severity: "info",
      });
    }
  }

  // Sort: urgent first, then warning, then info
  tips.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return tips;
}
