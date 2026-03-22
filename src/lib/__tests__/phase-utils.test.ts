import { describe, it, expect } from "vitest";
import {
  getActivePhases,
  getPhasesStartingNextWeek,
  getRepiquageStatus,
  getSmartActivePhases,
} from "../phase-utils";
import type { PlantActionRow } from "../phase-utils";

function makeRow(
  calendar: PlantActionRow["calendar"],
  overrides?: Partial<PlantActionRow>
): PlantActionRow {
  return {
    id: 1,
    plantId: 1,
    name: "Tomate",
    plantedDate: null,
    daysIndoorToRepiquage: null,
    frostTolerance: null,
    spacingCm: null,
    rowSpacingCm: null,
    calendar,
    ...overrides,
  };
}

describe("getActivePhases", () => {
  it("returns empty array when calendar is null", () => {
    const row = makeRow(null);
    expect(getActivePhases(row, 10)).toEqual([]);
  });

  it("returns single active phase", () => {
    const row = makeRow({
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
    });
    expect(getActivePhases(row, 7)).toEqual(["indoor_sow"]);
  });

  it("returns multiple active phases when week overlaps ranges", () => {
    const row = makeRow({
      indoor_sow_start: 5,
      indoor_sow_end: 12,
      transplant_start: 10,
      transplant_end: 15,
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
    });
    const phases = getActivePhases(row, 11);
    expect(phases).toContain("indoor_sow");
    expect(phases).toContain("transplant");
    expect(phases).toHaveLength(2);
  });

  it("returns empty array when week is outside all ranges", () => {
    const row = makeRow({
      indoor_sow_start: 5,
      indoor_sow_end: 8,
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
    });
    expect(getActivePhases(row, 20)).toEqual([]);
  });
});

describe("getPhasesStartingNextWeek", () => {
  it("returns empty array when no phases start on nextWeek", () => {
    const row = makeRow({
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
    });
    expect(getPhasesStartingNextWeek(row, 9)).toEqual([]);
  });

  it("returns phase that starts exactly on nextWeek", () => {
    const row = makeRow({
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
    });
    expect(getPhasesStartingNextWeek(row, 15)).toEqual(["outdoor_sow"]);
  });

  it("returns empty array when calendar is null", () => {
    const row = makeRow(null);
    expect(getPhasesStartingNextWeek(row, 10)).toEqual([]);
  });
});

describe("getRepiquageStatus", () => {
  const today = new Date("2026-03-22");

  it("returns no_data when plantedDate is null", () => {
    expect(getRepiquageStatus(null, 28, today)).toEqual({ status: "no_data" });
  });

  it("returns no_data when daysIndoorToRepiquage is null", () => {
    expect(getRepiquageStatus("2026-03-20", null, today)).toEqual({
      status: "no_data",
    });
  });

  it("returns growing when repiquage is >7 days away", () => {
    // Planted 2 days ago, 28 days to repiquage => 26 days left
    const result = getRepiquageStatus("2026-03-20", 28, today);
    expect(result.status).toBe("growing");
    if (result.status === "growing") {
      expect(result.daysSincePlanted).toBe(2);
      expect(result.daysUntilRepiquage).toBe(26);
    }
  });

  it("returns soon when repiquage is 1-7 days away", () => {
    // Planted 21 days ago, 28 days to repiquage => 7 days left
    const result = getRepiquageStatus("2026-03-01", 28, today);
    expect(result.status).toBe("soon");
    if (result.status === "soon") {
      expect(result.daysUntilRepiquage).toBeGreaterThanOrEqual(1);
      expect(result.daysUntilRepiquage).toBeLessThanOrEqual(7);
    }
  });

  it("returns ready when repiquage is today (0 days)", () => {
    // Planted 28 days ago, 28 days to repiquage => 0 days left
    const result = getRepiquageStatus("2026-02-22", 28, today);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.daysUntilRepiquage).toBe(0);
    }
  });

  it("returns ready with negative daysUntilRepiquage when overdue", () => {
    // Planted long ago, 28 days to repiquage => overdue
    const result = getRepiquageStatus("2026-02-15", 28, today);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.daysUntilRepiquage).toBeLessThan(0);
    }
  });
});

describe("getSmartActivePhases", () => {
  const today = new Date("2026-03-22");

  const calWithBothPhases: PlantActionRow["calendar"] = {
    indoor_sow_start: 5,
    indoor_sow_end: 12,
    transplant_start: 10,
    transplant_end: 15,
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

  it("removes transplant when repiquage is growing (>7 days away)", () => {
    const row = makeRow(calWithBothPhases, {
      plantedDate: "2026-03-20", // 2 days ago
      daysIndoorToRepiquage: 28, // 26 days left
    });
    const phases = getSmartActivePhases(row, 11, today);
    expect(phases).toContain("indoor_sow");
    expect(phases).not.toContain("transplant");
  });

  it("keeps transplant when repiquage is soon (<=7 days)", () => {
    const row = makeRow(calWithBothPhases, {
      plantedDate: "2026-03-01", // ~21 days ago
      daysIndoorToRepiquage: 28, // ~7 days left
    });
    const phases = getSmartActivePhases(row, 11, today);
    expect(phases).toContain("indoor_sow");
    expect(phases).toContain("transplant");
  });

  it("keeps transplant when repiquage is ready", () => {
    const row = makeRow(calWithBothPhases, {
      plantedDate: "2026-02-22", // 28 days ago
      daysIndoorToRepiquage: 28, // 0 days left
    });
    const phases = getSmartActivePhases(row, 11, today);
    expect(phases).toContain("transplant");
  });

  it("keeps transplant when no plantedDate (no_data)", () => {
    const row = makeRow(calWithBothPhases);
    const phases = getSmartActivePhases(row, 11, today);
    expect(phases).toContain("transplant");
  });
});
