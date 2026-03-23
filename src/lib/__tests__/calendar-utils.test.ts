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
  it("returns a number between 1 and 35", () => {
    const week = getCurrentWeek();
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(35);
  });
});

describe("weekToDate", () => {
  // February: weeks 1-3 (chart columns Feb w2-w4)
  it("week 1 maps to February 8 (Feb week 2)", () => {
    const date = weekToDate(1, 2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(8);
  });

  it("week 3 maps to February 22 (Feb week 4)", () => {
    const date = weekToDate(3, 2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(22);
  });

  // March: weeks 4-7
  it("week 4 maps to March 1", () => {
    const date = weekToDate(4, 2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it("week 7 maps to March 22", () => {
    const date = weekToDate(7, 2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(22);
  });

  // April: weeks 8-11
  it("week 8 maps to April 1", () => {
    const date = weekToDate(8, 2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(1);
  });

  it("week 9 maps to April 8", () => {
    const date = weekToDate(9, 2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(8);
  });

  // May: weeks 12-15
  it("week 12 maps to May 1", () => {
    const date = weekToDate(12, 2026);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(1);
  });

  // June: weeks 16-19
  it("week 16 maps to June 1", () => {
    const date = weekToDate(16, 2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(1);
  });

  // July: weeks 20-23
  it("week 20 maps to July 1", () => {
    const date = weekToDate(20, 2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(1);
  });

  // August: weeks 24-27
  it("week 24 maps to August 1", () => {
    const date = weekToDate(24, 2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(1);
  });

  // September: weeks 28-31
  it("week 28 maps to September 1", () => {
    const date = weekToDate(28, 2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(1);
  });

  // October: weeks 32-35
  it("week 32 maps to October 1", () => {
    const date = weekToDate(32, 2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(1);
  });

  it("week 35 maps to October 22", () => {
    const date = weekToDate(35, 2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(22);
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

  it("returns false for mid-season week 20", () => {
    expect(isOffSeason(20)).toBe(false);
  });
});

describe("getMonthForWeek", () => {
  it("returns Février for week 1", () => {
    expect(getMonthForWeek(1)).toBe("Février");
  });

  it("returns Février for week 3", () => {
    expect(getMonthForWeek(3)).toBe("Février");
  });

  it("returns Mars for week 4", () => {
    expect(getMonthForWeek(4)).toBe("Mars");
  });

  it("returns Mars for week 7", () => {
    expect(getMonthForWeek(7)).toBe("Mars");
  });

  it("returns Avril for week 8", () => {
    expect(getMonthForWeek(8)).toBe("Avril");
  });

  it("returns Avril for week 11", () => {
    expect(getMonthForWeek(11)).toBe("Avril");
  });

  it("returns Mai for week 12", () => {
    expect(getMonthForWeek(12)).toBe("Mai");
  });

  it("returns Juin for week 16", () => {
    expect(getMonthForWeek(16)).toBe("Juin");
  });

  it("returns Juillet for week 20", () => {
    expect(getMonthForWeek(20)).toBe("Juillet");
  });

  it("returns Août for week 24", () => {
    expect(getMonthForWeek(24)).toBe("Août");
  });

  it("returns Septembre for week 28", () => {
    expect(getMonthForWeek(28)).toBe("Septembre");
  });

  it("returns Octobre for week 32", () => {
    expect(getMonthForWeek(32)).toBe("Octobre");
  });
});

describe("getWeekLabel", () => {
  it("returns Février semaine 2 for week 1", () => {
    expect(getWeekLabel(1)).toBe("Février, semaine 2");
  });

  it("returns Mars semaine 4 for week 7", () => {
    expect(getWeekLabel(7)).toBe("Mars, semaine 4");
  });

  it("returns Avril semaine 1 for week 8", () => {
    expect(getWeekLabel(8)).toBe("Avril, semaine 1");
  });

  it("returns Avril semaine 2 for week 9", () => {
    expect(getWeekLabel(9)).toBe("Avril, semaine 2");
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

  it("returns semis_interieur for week 7", () => {
    expect(getSeasonPhase(7)).toBe("semis_interieur");
  });

  it("returns transplantation for week 8", () => {
    expect(getSeasonPhase(8)).toBe("transplantation");
  });

  it("returns transplantation for week 15", () => {
    expect(getSeasonPhase(15)).toBe("transplantation");
  });

  it("returns croissance for week 16", () => {
    expect(getSeasonPhase(16)).toBe("croissance");
  });

  it("returns croissance for week 23", () => {
    expect(getSeasonPhase(23)).toBe("croissance");
  });

  it("returns recolte for week 24", () => {
    expect(getSeasonPhase(24)).toBe("recolte");
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
