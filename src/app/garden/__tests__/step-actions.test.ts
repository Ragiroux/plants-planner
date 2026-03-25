import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeNextActionDate } from "@/lib/step-utils";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      user_plants: {
        findFirst: vi.fn(),
      },
      plants: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  },
}));

const plantWithIntervals = {
  days_indoor_to_repiquage: 30,
  days_repiquage_to_transplant: 14,
  days_transplant_to_harvest: 60,
};

const plantWithoutIntervals = {
  days_indoor_to_repiquage: null,
  days_repiquage_to_transplant: null,
  days_transplant_to_harvest: null,
};

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("computeNextActionDate", () => {
  it("semis_interieur → next in days_indoor_to_repiquage days", () => {
    const result = computeNextActionDate("semis_interieur", plantWithIntervals);
    expect(result).toBe(daysFromNow(30));
  });

  it("repiquage → next in days_repiquage_to_transplant days", () => {
    const result = computeNextActionDate("repiquage", plantWithIntervals);
    expect(result).toBe(daysFromNow(14));
  });

  it("transplantation → next in days_transplant_to_harvest days", () => {
    const result = computeNextActionDate("transplantation", plantWithIntervals);
    expect(result).toBe(daysFromNow(60));
  });

  it("arrosage → next in 7 days", () => {
    const result = computeNextActionDate("arrosage", plantWithIntervals);
    expect(result).toBe(daysFromNow(7));
  });

  it("fertilisation → next in 7 days", () => {
    const result = computeNextActionDate("fertilisation", plantWithIntervals);
    expect(result).toBe(daysFromNow(7));
  });

  it("entretien → next in 7 days", () => {
    const result = computeNextActionDate("entretien", plantWithIntervals);
    expect(result).toBe(daysFromNow(7));
  });

  it("recolte → no next action (null)", () => {
    const result = computeNextActionDate("recolte", plantWithIntervals);
    expect(result).toBeNull();
  });

  it("semis_interieur → null when plant has no interval data", () => {
    const result = computeNextActionDate("semis_interieur", plantWithoutIntervals);
    expect(result).toBeNull();
  });

  it("repiquage → null when plant has no interval data", () => {
    const result = computeNextActionDate("repiquage", plantWithoutIntervals);
    expect(result).toBeNull();
  });

  it("transplantation → null when plant has no interval data", () => {
    const result = computeNextActionDate("transplantation", plantWithoutIntervals);
    expect(result).toBeNull();
  });
});

describe("logStep ownership validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns error when user is not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { logStep } = await import("../[id]/actions");
    const result = await logStep(1, "arrosage");

    expect(result.error).toBe("Non authentifié");
  });

  it("returns error when user_plant does not belong to authenticated user", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    vi.mocked(db.query.user_plants.findFirst).mockResolvedValue({
      id: 1,
      user_id: "other-user",
      garden_id: 1,
      plant_id: 1,
      variety_id: null,
      quantity: 1,
      planted_date: null,
      repiquage_at: null,
      transplant_at: null,
      notes: null,
      sowing_type: null,
      created_at: new Date(),
    });

    const { logStep } = await import("../[id]/actions");
    const result = await logStep(1, "arrosage");

    expect(result.error).toBe("Plante introuvable ou accès refusé");
  });
});
