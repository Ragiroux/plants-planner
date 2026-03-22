import { describe, it, expect } from "vitest";
import { toMeters, fromMeters, unitLabel, unitSquaredLabel } from "../units";

describe("toMeters", () => {
  it("converts feet to meters", () => {
    expect(toMeters(10, "feet")).toBeCloseTo(3.048);
  });

  it("returns value unchanged for meters", () => {
    expect(toMeters(10, "meters")).toBe(10);
  });
});

describe("fromMeters", () => {
  it("converts meters to feet", () => {
    expect(fromMeters(3.048, "feet")).toBeCloseTo(10);
  });

  it("returns value unchanged for meters", () => {
    expect(fromMeters(10, "meters")).toBe(10);
  });
});

describe("unitLabel", () => {
  it("returns m for meters", () => {
    expect(unitLabel("meters")).toBe("m");
  });

  it("returns pi for feet", () => {
    expect(unitLabel("feet")).toBe("pi");
  });
});

describe("unitSquaredLabel", () => {
  it("returns m² for meters", () => {
    expect(unitSquaredLabel("meters")).toBe("m²");
  });

  it("returns pi² for feet", () => {
    expect(unitSquaredLabel("feet")).toBe("pi²");
  });
});

describe("round-trip conversion", () => {
  it("toMeters(fromMeters(5, feet), feet) ≈ 5", () => {
    expect(toMeters(fromMeters(5, "feet"), "feet")).toBeCloseTo(5);
  });
});
