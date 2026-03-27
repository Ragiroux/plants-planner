import { describe, it, expect } from "vitest";
import { computeNextPhaseAction } from "../phase-utils";

describe("computeNextPhaseAction", () => {
  it("returns null when in Semis intérieur (pre-germination, no phase advance)", () => {
    const result = computeNextPhaseAction(
      "Semis intérieur",
      null,        // repiquageAt
      null,        // transplantAt
      "indoor",    // sowingType
      14,          // daysRepiquageToTransplant (d2)
      false        // isComplete
    );
    expect(result).toBeNull();
  });

  it("returns repiquage when in Germé for native indoor (Cas 1, has d2)", () => {
    const result = computeNextPhaseAction(
      "Germé",
      null,
      null,
      "indoor",
      14,    // d2 exists → native indoor
      false
    );
    expect(result).toBe("repiquage");
  });

  it("returns null when in Germé for direct-sow indoor (Cas 2, no d2)", () => {
    const result = computeNextPhaseAction(
      "Germé",
      null,
      null,
      "indoor",
      null,   // d2 is null → direct-sow indoor
      false
    );
    expect(result).toBeNull();
  });

  it("returns transplant when in Acclimatation", () => {
    const result = computeNextPhaseAction(
      "Acclimatation",
      "2026-03-01",
      null,
      "indoor",
      14,
      false
    );
    expect(result).toBe("transplant");
  });

  it("returns transplant when in Repiquage and transplant not done", () => {
    const result = computeNextPhaseAction(
      "Repiquage",
      "2026-03-01",
      null,
      "indoor",
      14,
      false
    );
    expect(result).toBe("transplant");
  });

  it("returns null when Repiquage is done and transplant already done", () => {
    const result = computeNextPhaseAction(
      "Repiquage",
      "2026-03-01",
      "2026-03-15",
      "indoor",
      14,
      false
    );
    expect(result).toBeNull();
  });

  it("returns null when plant is complete", () => {
    const result = computeNextPhaseAction(
      "Au potager",
      "2026-03-01",
      "2026-03-15",
      "indoor",
      14,
      true
    );
    expect(result).toBeNull();
  });

  it("returns null when segmentLabel is null", () => {
    const result = computeNextPhaseAction(
      null,
      null,
      null,
      null,
      null,
      false
    );
    expect(result).toBeNull();
  });

  it("returns null for Au potager segment (maintenance phase, no advance)", () => {
    const result = computeNextPhaseAction(
      "Au potager",
      "2026-03-01",
      "2026-04-01",
      "indoor",
      14,
      false
    );
    expect(result).toBeNull();
  });
});
