import { describe, it, expect } from "vitest";
import { getPlantEmoji, getStatusLabel } from "../plant-utils";
import type { PlantCalendar } from "../plant-utils";

describe("getPlantEmoji", () => {
  it("returns 🍅 for tomate", () => {
    expect(getPlantEmoji("Tomate")).toBe("🍅");
  });

  it("returns 🥕 for carotte", () => {
    expect(getPlantEmoji("Carotte")).toBe("🥕");
  });

  it("returns 🌱 for unknown plant", () => {
    expect(getPlantEmoji("Plante inconnue")).toBe("🌱");
  });

  it("is case insensitive", () => {
    expect(getPlantEmoji("TOMATE")).toBe("🍅");
    expect(getPlantEmoji("tomate")).toBe("🍅");
    expect(getPlantEmoji("Tomate Roma")).toBe("🍅");
  });
});

describe("getStatusLabel", () => {
  it("returns hors saison for null calendar", () => {
    const result = getStatusLabel(null, 10);
    expect(result.label).toBe("Hors saison");
  });

  it("returns Semis intérieur when in indoor_sow range", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: 5,
      indoor_sow_end: 10,
      transplant_start: null,
      transplant_end: null,
      outdoor_sow_start: null,
      outdoor_sow_end: null,
      garden_transplant_start: null,
      garden_transplant_end: null,
      harvest_start: null,
      harvest_end: null,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 7);
    expect(result.label).toBe("Semis intérieur");
  });

  it("returns Repiquage when in transplant range", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: null,
      indoor_sow_end: null,
      transplant_start: 10,
      transplant_end: 14,
      outdoor_sow_start: null,
      outdoor_sow_end: null,
      garden_transplant_start: null,
      garden_transplant_end: null,
      harvest_start: null,
      harvest_end: null,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 12);
    expect(result.label).toBe("Repiquage");
  });

  it("returns Semis extérieur when in outdoor_sow range", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: null,
      indoor_sow_end: null,
      transplant_start: null,
      transplant_end: null,
      outdoor_sow_start: 15,
      outdoor_sow_end: 20,
      garden_transplant_start: null,
      garden_transplant_end: null,
      harvest_start: null,
      harvest_end: null,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 17);
    expect(result.label).toBe("Semis extérieur");
  });

  it("returns Au jardin when in garden_transplant range", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: null,
      indoor_sow_end: null,
      transplant_start: null,
      transplant_end: null,
      outdoor_sow_start: null,
      outdoor_sow_end: null,
      garden_transplant_start: 18,
      garden_transplant_end: 22,
      harvest_start: null,
      harvest_end: null,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 20);
    expect(result.label).toBe("Au jardin");
  });

  it("returns Récolte when in harvest range", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: null,
      indoor_sow_end: null,
      transplant_start: null,
      transplant_end: null,
      outdoor_sow_start: null,
      outdoor_sow_end: null,
      garden_transplant_start: null,
      garden_transplant_end: null,
      harvest_start: 28,
      harvest_end: 36,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 30);
    expect(result.label).toBe("Récolte");
  });

  it("returns Hors saison when week is outside all ranges", () => {
    const calendar: PlantCalendar = {
      indoor_sow_start: 5,
      indoor_sow_end: 8,
      transplant_start: 10,
      transplant_end: 12,
      outdoor_sow_start: null,
      outdoor_sow_end: null,
      garden_transplant_start: null,
      garden_transplant_end: null,
      harvest_start: null,
      harvest_end: null,
      depth_mm: null,
      germination_temp_min: null,
      germination_temp_max: null,
      sowing_method: null,
      luminosity: null,
      height_cm: null,
      days_to_maturity_min: null,
      days_to_maturity_max: null,
    };
    const result = getStatusLabel(calendar, 1);
    expect(result.label).toBe("Hors saison");
  });
});
