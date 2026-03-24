import { describe, it, expect } from "vitest";
import { generateSmartTips } from "../smart-tips";
import type { SmartTipContext, SmartTipPlant, SmartTipWeather } from "../smart-tips";

const today = new Date("2024-07-15T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
}

function makePlant(overrides?: Partial<SmartTipPlant>): SmartTipPlant {
  return {
    name: "Tomate",
    emoji: "🍅",
    frostTolerance: "tender",
    wateringFreq: "regular",
    isInGarden: true,
    lastWatering: null,
    lastFertilization: null,
    ...overrides,
  };
}

function makeWeather(overrides?: Partial<SmartTipWeather>): SmartTipWeather {
  return {
    forecast: [
      { day: "Lun", min: 15, max: 22 },
      { day: "Mar", min: 16, max: 24 },
    ],
    frostWarning: false,
    ...overrides,
  };
}

function makeCtx(overrides?: Partial<SmartTipContext>): SmartTipContext {
  return {
    plants: [],
    weather: null,
    today,
    ...overrides,
  };
}

// --- No plants in garden ---
describe("no plants in garden", () => {
  it("returns empty tips when no plants", () => {
    const tips = generateSmartTips(makeCtx());
    expect(tips).toHaveLength(0);
  });

  it("returns no watering tips when plants not in garden", () => {
    const plant = makePlant({ isInGarden: false, lastWatering: daysAgo(10) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "watering")).toHaveLength(0);
  });
});

// --- Watering tips ---
describe("watering tips", () => {
  it("no watering tip when lastWatering is null", () => {
    const plant = makePlant({ lastWatering: null });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "watering")).toHaveLength(0);
  });

  it("urgent tip when overdue by more than interval", () => {
    // regular = 5 days; 8 days since last watering
    const plant = makePlant({ wateringFreq: "regular", lastWatering: daysAgo(8) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    const waterTips = tips.filter((t) => t.type === "watering");
    expect(waterTips).toHaveLength(1);
    expect(waterTips[0].severity).toBe("urgent");
    expect(waterTips[0].message).toContain("8 jours");
  });

  it("warning tip when exactly at interval", () => {
    // frequent = 3 days; 3 days since last watering
    const plant = makePlant({ wateringFreq: "frequent", lastWatering: daysAgo(3) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    const waterTips = tips.filter((t) => t.type === "watering");
    expect(waterTips).toHaveLength(1);
    expect(waterTips[0].severity).toBe("warning");
    expect(waterTips[0].message).toContain("recommandé aujourd'hui");
  });

  it("no tip when watered recently", () => {
    // moderate = 7 days; watered 4 days ago
    const plant = makePlant({ wateringFreq: "moderate", lastWatering: daysAgo(4) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "watering")).toHaveLength(0);
  });

  it("uses default interval of 7 days when wateringFreq is null", () => {
    const plant = makePlant({ wateringFreq: null, lastWatering: daysAgo(8) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    const waterTips = tips.filter((t) => t.type === "watering");
    expect(waterTips).toHaveLength(1);
    expect(waterTips[0].severity).toBe("urgent");
  });

  it("low frequency: no tip at 9 days, tip at 10 days", () => {
    const plant9 = makePlant({ wateringFreq: "low", lastWatering: daysAgo(9) });
    const plant10 = makePlant({ wateringFreq: "low", lastWatering: daysAgo(10) });
    const tips9 = generateSmartTips(makeCtx({ plants: [plant9] }));
    const tips10 = generateSmartTips(makeCtx({ plants: [plant10] }));
    expect(tips9.filter((t) => t.type === "watering")).toHaveLength(0);
    expect(tips10.filter((t) => t.type === "watering")).toHaveLength(1);
    expect(tips10[0].severity).toBe("warning");
  });
});

// --- Heat tips ---
describe("heat tips", () => {
  it("no heat tip when no weather data", () => {
    const tips = generateSmartTips(makeCtx({ weather: null }));
    expect(tips.filter((t) => t.type === "heat")).toHaveLength(0);
  });

  it("no heat tip when all days below threshold", () => {
    const weather = makeWeather({
      forecast: [
        { day: "Lun", min: 15, max: 28 },
        { day: "Mar", min: 16, max: 29 },
      ],
    });
    const tips = generateSmartTips(makeCtx({ weather }));
    expect(tips.filter((t) => t.type === "heat")).toHaveLength(0);
  });

  it("single heat tip for hottest day when multiple hot days", () => {
    const weather = makeWeather({
      forecast: [
        { day: "Lun", min: 20, max: 31 },
        { day: "Mar", min: 22, max: 35 },
        { day: "Mer", min: 21, max: 30 },
      ],
    });
    const tips = generateSmartTips(makeCtx({ weather }));
    const heatTips = tips.filter((t) => t.type === "heat");
    expect(heatTips).toHaveLength(1);
    expect(heatTips[0].message).toContain("35°C");
    expect(heatTips[0].message).toContain("Mar");
    expect(heatTips[0].severity).toBe("warning");
  });

  it("heat tip at exactly 30 degrees", () => {
    const weather = makeWeather({
      forecast: [{ day: "Jeu", min: 18, max: 30 }],
    });
    const tips = generateSmartTips(makeCtx({ weather }));
    expect(tips.filter((t) => t.type === "heat")).toHaveLength(1);
  });
});

// --- Frost tips ---
describe("frost tips", () => {
  it("no frost tip when frostWarning is false", () => {
    const weather = makeWeather({ frostWarning: false });
    const tips = generateSmartTips(makeCtx({ weather }));
    expect(tips.filter((t) => t.type === "frost")).toHaveLength(0);
  });

  it("urgent tip with tender plant names when frost warning", () => {
    const tender1 = makePlant({ name: "Tomate", frostTolerance: "tender", isInGarden: true });
    const tender2 = makePlant({ name: "Poivron", frostTolerance: "tender", isInGarden: true });
    const hardy = makePlant({ name: "Chou", frostTolerance: "hardy", isInGarden: true });
    const weather = makeWeather({
      frostWarning: true,
      forecast: [
        { day: "Lun", min: -2, max: 8 },
        { day: "Mar", min: -3, max: 5 },
      ],
    });
    const tips = generateSmartTips(makeCtx({ plants: [tender1, tender2, hardy], weather }));
    const frostTips = tips.filter((t) => t.type === "frost");
    expect(frostTips).toHaveLength(1);
    expect(frostTips[0].severity).toBe("urgent");
    expect(frostTips[0].message).toContain("Tomate");
    expect(frostTips[0].message).toContain("Poivron");
    expect(frostTips[0].message).toContain("-3");
  });

  it("info tip when frost warning but no tender plants in garden", () => {
    const hardy = makePlant({ name: "Chou", frostTolerance: "hardy", isInGarden: true });
    const tenderOut = makePlant({ name: "Tomate", frostTolerance: "tender", isInGarden: false });
    const weather = makeWeather({
      frostWarning: true,
      forecast: [{ day: "Lun", min: -1, max: 4 }],
    });
    const tips = generateSmartTips(makeCtx({ plants: [hardy, tenderOut], weather }));
    const frostTips = tips.filter((t) => t.type === "frost");
    expect(frostTips).toHaveLength(1);
    expect(frostTips[0].severity).toBe("info");
  });

  it("frost tip with no tender plants and empty garden", () => {
    const weather = makeWeather({
      frostWarning: true,
      forecast: [{ day: "Lun", min: -2, max: 5 }],
    });
    const tips = generateSmartTips(makeCtx({ plants: [], weather }));
    const frostTips = tips.filter((t) => t.type === "frost");
    expect(frostTips).toHaveLength(1);
    expect(frostTips[0].severity).toBe("info");
  });
});

// --- Fertilization tips ---
describe("fertilization tips", () => {
  it("no fertilization tip when lastFertilization is null", () => {
    const plant = makePlant({ lastFertilization: null });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "fertilization")).toHaveLength(0);
  });

  it("no fertilization tip for plant not in garden", () => {
    const plant = makePlant({ isInGarden: false, lastFertilization: daysAgo(20) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "fertilization")).toHaveLength(0);
  });

  it("info tip when fertilization overdue", () => {
    const plant = makePlant({ lastFertilization: daysAgo(20) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    const fertTips = tips.filter((t) => t.type === "fertilization");
    expect(fertTips).toHaveLength(1);
    expect(fertTips[0].severity).toBe("info");
    expect(fertTips[0].message).toContain("20 jours");
  });

  it("no tip when exactly at interval (14 days)", () => {
    const plant = makePlant({ lastFertilization: daysAgo(14) });
    const tips = generateSmartTips(makeCtx({ plants: [plant] }));
    expect(tips.filter((t) => t.type === "fertilization")).toHaveLength(0);
  });

  it("no weather data does not affect fertilization tips", () => {
    const plant = makePlant({ lastFertilization: daysAgo(21) });
    const tips = generateSmartTips(makeCtx({ plants: [plant], weather: null }));
    expect(tips.filter((t) => t.type === "fertilization")).toHaveLength(1);
  });
});

// --- Sort order ---
describe("sort order", () => {
  it("sorts urgent before warning before info", () => {
    const plant = makePlant({
      wateringFreq: "frequent",
      lastWatering: daysAgo(8), // urgent
      lastFertilization: daysAgo(20), // info
    });
    const weather = makeWeather({
      frostWarning: false,
      forecast: [{ day: "Lun", min: 20, max: 32 }], // warning (heat)
    });
    const tips = generateSmartTips(makeCtx({ plants: [plant], weather }));
    const severities = tips.map((t) => t.severity);
    const urgentIdx = severities.indexOf("urgent");
    const warningIdx = severities.indexOf("warning");
    const infoIdx = severities.indexOf("info");
    expect(urgentIdx).toBeLessThan(warningIdx);
    expect(warningIdx).toBeLessThan(infoIdx);
  });
});
