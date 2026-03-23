import { describe, it, expect } from "vitest";
import {
  getActivePhases,
  getPhasesStartingNextWeek,
  getPhaseReadiness,
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
    daysRepiquageToTransplant: null,
    daysTransplantToHarvest: null,
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

describe("getPhaseReadiness", () => {
  const today = new Date("2026-03-22");

  it("returns no_data when plantedDate is null", () => {
    expect(getPhaseReadiness(null, 28, today)).toEqual({ status: "no_data" });
  });

  it("returns no_data when cumulativeDays is null", () => {
    expect(getPhaseReadiness("2026-03-20", null, today)).toEqual({ status: "no_data" });
  });

  it("returns not_ready when ready date is more than 7 days away", () => {
    // Planted 2 days ago, cumulative 28 days => 26 days left
    const result = getPhaseReadiness("2026-03-20", 28, today);
    expect(result.status).toBe("not_ready");
    if (result.status === "not_ready") {
      expect(result.daysUntilReady).toBe(26);
    }
  });

  it("returns soon when ready date is 1-7 days away", () => {
    // Planted 21 days ago, cumulative 28 days => 7 days left
    const result = getPhaseReadiness("2026-03-01", 28, today);
    expect(result.status).toBe("soon");
    if (result.status === "soon") {
      expect(result.daysUntilReady).toBeGreaterThanOrEqual(1);
      expect(result.daysUntilReady).toBeLessThanOrEqual(7);
    }
  });

  it("returns ready when ready date is today (0 days)", () => {
    // Planted 28 days ago, cumulative 28 days => 0 days left
    const result = getPhaseReadiness("2026-02-22", 28, today);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.daysUntilReady).toBe(0);
    }
  });

  it("returns ready with negative daysUntilReady when overdue", () => {
    // Planted long ago, cumulative 28 days => overdue
    const result = getPhaseReadiness("2026-02-15", 28, today);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.daysUntilReady).toBeLessThan(0);
    }
  });
});

describe("getSmartActivePhases biology suppression", () => {
  const today = new Date("2026-03-22");

  const fullCalendar: PlantActionRow["calendar"] = {
    indoor_sow_start: 5,
    indoor_sow_end: 12,
    transplant_start: 10,
    transplant_end: 15,
    outdoor_sow_start: null,
    outdoor_sow_end: null,
    garden_transplant_start: 14,
    garden_transplant_end: 20,
    harvest_start: 22,
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

  it("suppresses garden_transplant when biology says not_ready (planted 5 days ago, needs 28+14 days)", () => {
    // week 14 is in garden_transplant_start range; planted 5 days ago needs 42 cumulative days => not ready
    const row = makeRow(fullCalendar, {
      plantedDate: "2026-03-17", // 5 days ago
      daysIndoorToRepiquage: 28,
      daysRepiquageToTransplant: 14,
    });
    const phases = getSmartActivePhases(row, 14, today);
    expect(phases).not.toContain("garden_transplant");
  });

  it("shows garden_transplant when biology says ready/soon", () => {
    // planted 42 days ago, needs 28+14=42 cumulative days => ready
    const row = makeRow(fullCalendar, {
      plantedDate: "2026-02-08", // 42 days ago
      daysIndoorToRepiquage: 28,
      daysRepiquageToTransplant: 14,
    });
    const phases = getSmartActivePhases(row, 14, today);
    expect(phases).toContain("garden_transplant");
  });

  it("suppresses harvest when biology says not_ready", () => {
    // week 22 is in harvest_start range; planted 5 days ago needs 28+14+30=72 days => not ready
    const row = makeRow(fullCalendar, {
      plantedDate: "2026-03-17", // 5 days ago
      daysIndoorToRepiquage: 28,
      daysRepiquageToTransplant: 14,
      daysTransplantToHarvest: 30,
    });
    const phases = getSmartActivePhases(row, 22, today);
    expect(phases).not.toContain("harvest");
  });

  it("falls back to calendar behavior for garden_transplant when daysRepiquageToTransplant is null", () => {
    const row = makeRow(fullCalendar, {
      plantedDate: "2026-03-17",
      daysIndoorToRepiquage: 28,
      daysRepiquageToTransplant: null, // null => no suppression
    });
    const phases = getSmartActivePhases(row, 14, today);
    expect(phases).toContain("garden_transplant");
  });

  it("falls back to calendar behavior for harvest when any duration is null", () => {
    const row = makeRow(fullCalendar, {
      plantedDate: "2026-03-17",
      daysIndoorToRepiquage: 28,
      daysRepiquageToTransplant: 14,
      daysTransplantToHarvest: null, // null => no suppression
    });
    const phases = getSmartActivePhases(row, 22, today);
    expect(phases).toContain("harvest");
  });
});
