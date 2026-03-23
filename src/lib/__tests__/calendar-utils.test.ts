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
  it("returns a number between 1 and 39", () => {
    const week = getCurrentWeek();
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(39);
  });
});

describe("weekToDate", () => {
  it("week 1 maps to February 1", () => {
    const date = weekToDate(1, 2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(1);
  });

  it("week 4 maps to February 22", () => {
    const date = weekToDate(4, 2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(22);
  });

  it("week 5 maps to March 1", () => {
    const date = weekToDate(5, 2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it("week 8 maps to March 22", () => {
    const date = weekToDate(8, 2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(22);
  });

  it("week 9 maps to April 1", () => {
    const date = weekToDate(9, 2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(1);
  });

  it("week 13 maps to April 29", () => {
    const date = weekToDate(13, 2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(29);
  });

  it("week 14 maps to May 1", () => {
    const date = weekToDate(14, 2026);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(1);
  });

  it("week 19 maps to June 1", () => {
    const date = weekToDate(19, 2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(1);
  });

  it("week 23 maps to July 1", () => {
    const date = weekToDate(23, 2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(1);
  });

  it("week 27 maps to August 1", () => {
    const date = weekToDate(27, 2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(1);
  });

  it("week 32 maps to September 1", () => {
    const date = weekToDate(32, 2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(1);
  });

  it("week 36 maps to October 1", () => {
    const date = weekToDate(36, 2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(1);
  });

  it("week 39 maps to October 22", () => {
    const date = weekToDate(39, 2026);
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

  it("returns Février for week 4", () => {
    expect(getMonthForWeek(4)).toBe("Février");
  });

  it("returns Mars for week 5", () => {
    expect(getMonthForWeek(5)).toBe("Mars");
  });

  it("returns Mars for week 8", () => {
    expect(getMonthForWeek(8)).toBe("Mars");
  });

  it("returns Avril for week 9", () => {
    expect(getMonthForWeek(9)).toBe("Avril");
  });

  it("returns Avril for week 13", () => {
    expect(getMonthForWeek(13)).toBe("Avril");
  });

  it("returns Mai for week 14", () => {
    expect(getMonthForWeek(14)).toBe("Mai");
  });

  it("returns Juin for week 19", () => {
    expect(getMonthForWeek(19)).toBe("Juin");
  });

  it("returns Juillet for week 23", () => {
    expect(getMonthForWeek(23)).toBe("Juillet");
  });

  it("returns Août for week 27", () => {
    expect(getMonthForWeek(27)).toBe("Août");
  });

  it("returns Septembre for week 32", () => {
    expect(getMonthForWeek(32)).toBe("Septembre");
  });

  it("returns Octobre for week 36", () => {
    expect(getMonthForWeek(36)).toBe("Octobre");
  });
});

describe("getWeekLabel", () => {
  it("returns Février semaine 1 for week 1", () => {
    expect(getWeekLabel(1)).toBe("Février, semaine 1");
  });

  it("returns Mars semaine 4 for week 8", () => {
    expect(getWeekLabel(8)).toBe("Mars, semaine 4");
  });

  it("returns Avril semaine 1 for week 9", () => {
    expect(getWeekLabel(9)).toBe("Avril, semaine 1");
  });

  it("returns Avril semaine 2 for week 10", () => {
    const label = getWeekLabel(10);
    expect(label).toBe("Avril, semaine 2");
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
