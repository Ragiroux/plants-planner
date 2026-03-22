import { describe, it, expect } from "vitest";
import {
  getCurrentWeek,
  isOffSeason,
  weekToDate,
  getWeekLabel,
  getMonthForWeek,
  getSeasonPhase,
  getFrenchDate,
} from "../calendar-utils";

describe("getCurrentWeek", () => {
  it("returns a number between 1 and 44", () => {
    const week = getCurrentWeek();
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(44);
  });
});

describe("weekToDate", () => {
  it("week 1 maps to approximately February 1", () => {
    const date = weekToDate(1, 2025);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBeGreaterThanOrEqual(1);
    expect(date.getDate()).toBeLessThanOrEqual(7);
  });

  it("week 5 maps to approximately March 1", () => {
    const date = weekToDate(5, 2025);
    expect(date.getMonth()).toBe(2);
  });

  it("week 9 maps to late March", () => {
    const date = weekToDate(9, 2025);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBeGreaterThanOrEqual(22);
  });

  it("week 13 maps to late April", () => {
    const date = weekToDate(13, 2025);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBeGreaterThanOrEqual(20);
  });

  it("week 18 maps to late May", () => {
    const date = weekToDate(18, 2025);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBeGreaterThanOrEqual(24);
  });

  it("week 22 maps to late June", () => {
    const date = weekToDate(22, 2025);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBeGreaterThanOrEqual(22);
  });

  it("week 26 maps to late July", () => {
    const date = weekToDate(26, 2025);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBeGreaterThanOrEqual(20);
  });

  it("week 31 maps to late August", () => {
    const date = weekToDate(31, 2025);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBeGreaterThanOrEqual(24);
  });

  it("week 35 maps to late September", () => {
    const date = weekToDate(35, 2025);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBeGreaterThanOrEqual(22);
  });

  it("uses current year when year is not provided", () => {
    const date = weekToDate(1);
    expect(date.getFullYear()).toBe(new Date().getFullYear());
  });
});

describe("isOffSeason", () => {
  it("returns true for week 0", () => {
    expect(isOffSeason(0)).toBe(true);
  });

  it("returns true for negative weeks", () => {
    expect(isOffSeason(-5)).toBe(true);
  });

  it("returns false for week 1", () => {
    expect(isOffSeason(1)).toBe(false);
  });

  it("returns false for week 39", () => {
    expect(isOffSeason(39)).toBe(false);
  });

  it("returns true for week 40", () => {
    expect(isOffSeason(40)).toBe(true);
  });

  it("returns true for week 44", () => {
    expect(isOffSeason(44)).toBe(true);
  });

  it("returns false for mid-season week 20", () => {
    expect(isOffSeason(20)).toBe(false);
  });
});

describe("getMonthForWeek", () => {
  it("returns Février for week 1", () => {
    expect(getMonthForWeek(1)).toBe("Février");
  });

  it("returns Mars for week 5", () => {
    expect(getMonthForWeek(5)).toBe("Mars");
  });

  it("returns Mars for week 9", () => {
    expect(getMonthForWeek(9)).toBe("Mars");
  });

  it("returns Avril for week 13", () => {
    expect(getMonthForWeek(13)).toBe("Avril");
  });

  it("returns Mai for week 18", () => {
    expect(getMonthForWeek(18)).toBe("Mai");
  });

  it("returns Juin for week 22", () => {
    expect(getMonthForWeek(22)).toBe("Juin");
  });

  it("returns Juillet for week 26", () => {
    expect(getMonthForWeek(26)).toBe("Juillet");
  });

  it("returns Août for week 31", () => {
    expect(getMonthForWeek(31)).toBe("Août");
  });

  it("returns Septembre for week 35", () => {
    expect(getMonthForWeek(35)).toBe("Septembre");
  });
});

describe("getWeekLabel", () => {
  it("returns month + week of month for week 1", () => {
    expect(getWeekLabel(1)).toBe("Février, semaine 1");
  });

  it("returns month + week of month for week 8", () => {
    // Week 8 = ~March 22 = March week 4
    const label = getWeekLabel(8);
    expect(label).toContain("Mars");
    expect(label).toMatch(/semaine \d/);
  });

  it("contains the month name", () => {
    const label = getWeekLabel(13);
    expect(label).toContain("Avril");
  });
});

describe("getSeasonPhase", () => {
  it("returns hors_saison for week 0", () => {
    expect(getSeasonPhase(0)).toBe("hors_saison");
  });

  it("returns hors_saison for week 40", () => {
    expect(getSeasonPhase(40)).toBe("hors_saison");
  });

  it("returns semis_interieur for week 1", () => {
    expect(getSeasonPhase(1)).toBe("semis_interieur");
  });

  it("returns semis_interieur for week 8", () => {
    expect(getSeasonPhase(8)).toBe("semis_interieur");
  });

  it("returns transplantation for week 9", () => {
    expect(getSeasonPhase(9)).toBe("transplantation");
  });

  it("returns transplantation for week 16", () => {
    expect(getSeasonPhase(16)).toBe("transplantation");
  });

  it("returns croissance for week 17", () => {
    expect(getSeasonPhase(17)).toBe("croissance");
  });

  it("returns croissance for week 22", () => {
    expect(getSeasonPhase(22)).toBe("croissance");
  });

  it("returns recolte for week 23", () => {
    expect(getSeasonPhase(23)).toBe("recolte");
  });

  it("returns recolte for week 39", () => {
    expect(getSeasonPhase(39)).toBe("recolte");
  });
});

describe("getFrenchDate", () => {
  it("formats a weekday name correctly", () => {
    const monday = new Date(2026, 2, 23);
    expect(getFrenchDate(monday)).toContain("Lundi");
  });

  it("formats month name in lowercase French", () => {
    const march = new Date(2026, 2, 22);
    expect(getFrenchDate(march)).toContain("mars");
  });

  it("formats the full date string correctly", () => {
    const sunday = new Date(2026, 2, 22);
    expect(getFrenchDate(sunday)).toBe("Dimanche 22 mars 2026");
  });

  it("formats a date in a different month correctly", () => {
    const date = new Date(2026, 5, 1);
    expect(getFrenchDate(date)).toContain("juin");
    expect(getFrenchDate(date)).toContain("2026");
  });
});
