import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      observations: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("createObservation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns error when user is not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 10, 2026, "Test content");

    expect(result.error).toBe("Non authentifié");
  });

  it("inserts observation with valid inputs", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as never);

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 10, 2026, "Les tomates poussent bien");

    expect(result.error).toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        week_number: 10,
        year: 2026,
        content: "Les tomates poussent bien",
        plant_id: null,
      })
    );
  });

  it("rejects empty content", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 10, 2026, "");

    expect(result.error).toBe("L'observation ne peut pas être vide");
  });

  it("rejects whitespace-only content", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 10, 2026, "   ");

    expect(result.error).toBe("L'observation ne peut pas être vide");
  });

  it("rejects week 0 (out of range)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 0, 2026, "Some content");

    expect(result.error).toBe("Le numéro de semaine doit être entre 1 et 44");
  });

  it("rejects week 45 (out of range)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 45, 2026, "Some content");

    expect(result.error).toBe("Le numéro de semaine doit être entre 1 et 44");
  });

  it("accepts week 1 (lower boundary)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as never);

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 1, 2026, "Début de saison");

    expect(result.error).toBeUndefined();
  });

  it("accepts week 44 (upper boundary)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as never);

    const { createObservation } = await import("../actions");
    const result = await createObservation(null, 44, 2026, "Fin de saison");

    expect(result.error).toBeUndefined();
  });
});

describe("deleteObservation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns error when user is not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { deleteObservation } = await import("../actions");
    const result = await deleteObservation(1);

    expect(result.error).toBe("Non authentifié");
  });

  it("returns error when observation does not belong to authenticated user", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    vi.mocked(db.query.observations.findFirst).mockResolvedValue({
      id: 1,
      user_id: "other-user",
      plant_id: null,
      garden_id: null,
      week_number: 10,
      year: 2026,
      content: "Some content",
      created_at: new Date(),
    });

    const { deleteObservation } = await import("../actions");
    const result = await deleteObservation(1);

    expect(result.error).toBe("Observation introuvable ou accès refusé");
  });

  it("returns error when observation is not found", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    vi.mocked(db.query.observations.findFirst).mockResolvedValue(undefined);

    const { deleteObservation } = await import("../actions");
    const result = await deleteObservation(999);

    expect(result.error).toBe("Observation introuvable ou accès refusé");
  });

  it("deletes observation when ownership is valid", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });

    const { db } = await import("@/lib/db");
    vi.mocked(db.query.observations.findFirst).mockResolvedValue({
      id: 1,
      user_id: "user-1",
      plant_id: null,
      garden_id: null,
      week_number: 10,
      year: 2026,
      content: "Some content",
      created_at: new Date(),
    });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({ where: whereMock } as never);

    const { deleteObservation } = await import("../actions");
    const result = await deleteObservation(1);

    expect(result.error).toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
  });
});
