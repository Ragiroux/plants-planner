import { describe, it, expect } from "vitest";
import { generateTip, type TipContext } from "../tip-templates";
import type { RepiquageStatus } from "../phase-utils";

function makeCtx(overrides?: Partial<TipContext>): TipContext {
  return {
    name: "Tomate",
    plantedDate: null,
    daysIndoorToRepiquage: null,
    frostTolerance: null,
    spacingCm: null,
    rowSpacingCm: null,
    germinationTempMin: null,
    germinationTempMax: null,
    depthMm: null,
    sowingMethod: null,
    heightCm: null,
    daysToMaturityMin: null,
    daysToMaturityMax: null,
    sowingType: null,
    germinatedAt: null,
    ...overrides,
  };
}

const noData: RepiquageStatus = { status: "no_data" };

describe("generateTip — indoor_sow", () => {
  it("shows germination temp for early days", () => {
    const ctx = makeCtx({ germinationTempMin: 26, germinationTempMax: 30 });
    const status: RepiquageStatus = {
      status: "growing",
      daysSincePlanted: 1,
      daysUntilRepiquage: 27,
    };
    expect(generateTip("indoor_sow", ctx, status)).toContain("26–30°C");
  });

  it("shows depth for early days when no temp", () => {
    const ctx = makeCtx({ depthMm: 5 });
    const status: RepiquageStatus = {
      status: "growing",
      daysSincePlanted: 2,
      daysUntilRepiquage: 26,
    };
    expect(generateTip("indoor_sow", ctx, status)).toContain("5mm");
  });

  it("shows patience message for days 4-14", () => {
    const ctx = makeCtx();
    const status: RepiquageStatus = {
      status: "growing",
      daysSincePlanted: 10,
      daysUntilRepiquage: 18,
    };
    expect(generateTip("indoor_sow", ctx, status)).toContain("patience");
  });

  it("shows soon message when repiquage is imminent", () => {
    const ctx = makeCtx();
    const status: RepiquageStatus = {
      status: "soon",
      daysSincePlanted: 23,
      daysUntilRepiquage: 5,
    };
    expect(generateTip("indoor_sow", ctx, status)).toContain("bientôt");
  });

  it("falls back to default", () => {
    expect(generateTip("indoor_sow", makeCtx(), noData)).toBe(
      "Semis intérieur en cours"
    );
  });
});

describe("generateTip — transplant", () => {
  it("shows overdue message", () => {
    const status: RepiquageStatus = {
      status: "ready",
      daysSincePlanted: 35,
      daysUntilRepiquage: -3,
    };
    const tip = generateTip("transplant", makeCtx(), status);
    expect(tip).toContain("retard");
    expect(tip).toContain("3");
  });

  it("shows ready today message", () => {
    const status: RepiquageStatus = {
      status: "ready",
      daysSincePlanted: 28,
      daysUntilRepiquage: 0,
    };
    expect(generateTip("transplant", makeCtx(), status)).toContain(
      "aujourd'hui"
    );
  });

  it("shows imminent message for 1-3 days", () => {
    const status: RepiquageStatus = {
      status: "soon",
      daysSincePlanted: 25,
      daysUntilRepiquage: 3,
    };
    expect(generateTip("transplant", makeCtx(), status)).toContain("feuilles");
  });

  it("shows preparation message for 4-7 days", () => {
    const status: RepiquageStatus = {
      status: "soon",
      daysSincePlanted: 21,
      daysUntilRepiquage: 7,
    };
    expect(generateTip("transplant", makeCtx(), status)).toContain("pots");
  });

  it("falls back for no_data", () => {
    expect(generateTip("transplant", makeCtx(), noData)).toContain(
      "vérifiez vos semis"
    );
  });
});

describe("generateTip — outdoor_sow", () => {
  it("warns about frost for tender plants", () => {
    const ctx = makeCtx({ frostTolerance: "tender" });
    expect(generateTip("outdoor_sow", ctx, noData)).toContain("gel");
  });

  it("reassures hardy plants", () => {
    const ctx = makeCtx({ frostTolerance: "hardy" });
    expect(generateTip("outdoor_sow", ctx, noData)).toContain("froid");
  });

  it("falls back to default", () => {
    expect(generateTip("outdoor_sow", makeCtx(), noData)).toBe(
      "Semis extérieur en cours"
    );
  });
});

describe("generateTip — garden_transplant", () => {
  it("warns tender plants about frost", () => {
    const ctx = makeCtx({ frostTolerance: "tender" });
    expect(generateTip("garden_transplant", ctx, noData)).toContain("gel");
  });

  it("shows spacing when available", () => {
    const ctx = makeCtx({ spacingCm: 57, rowSpacingCm: 115 });
    expect(generateTip("garden_transplant", ctx, noData)).toContain("57cm");
  });

  it("falls back to watering advice", () => {
    expect(generateTip("garden_transplant", makeCtx(), noData)).toContain(
      "Arrosez"
    );
  });
});

describe("generateTip — harvest", () => {
  it("shows maturity days when available", () => {
    const ctx = makeCtx({ daysToMaturityMin: 55, daysToMaturityMax: 90 });
    expect(generateTip("harvest", ctx, noData)).toContain("55–90");
  });

  it("shows height when available", () => {
    const ctx = makeCtx({ heightCm: 70 });
    expect(generateTip("harvest", ctx, noData)).toContain("70cm");
  });

  it("falls back to morning harvest tip", () => {
    expect(generateTip("harvest", makeCtx(), noData)).toContain("matin");
  });
});
