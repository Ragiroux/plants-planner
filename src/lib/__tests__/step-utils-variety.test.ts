import { describe, it, expect } from "vitest";
import { stepObservationContent } from "../step-utils";

describe("stepObservationContent with variety", () => {
  it("includes variety name when provided", () => {
    const result = stepObservationContent("repiquage", "Tomate", "Coeur de boeuf");
    expect(result).toBe("🪴 Repiquage — Tomate (Coeur de boeuf)");
  });

  it("excludes variety when not provided", () => {
    const result = stepObservationContent("repiquage", "Tomate");
    expect(result).toBe("🪴 Repiquage — Tomate");
  });

  it("excludes variety when undefined", () => {
    const result = stepObservationContent("transplantation", "Radis", undefined);
    expect(result).toBe("🏡 Transplantation au potager — Radis");
  });

  it("works with all step types and variety", () => {
    const result = stepObservationContent("arrosage", "Basilic", "Genovese");
    expect(result).toBe("💧 Arrosage — Basilic (Genovese)");
  });
});
