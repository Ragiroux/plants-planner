import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { updateUnitPreference } from "@/app/settings/actions";

const mockAuth = vi.mocked(auth);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUnitPreference", () => {
  it("succeeds with meters when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const result = await updateUnitPreference("meters");
    expect(result).toEqual({ success: true });
  });

  it("succeeds with feet when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const result = await updateUnitPreference("feet");
    expect(result).toEqual({ success: true });
  });

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateUnitPreference("meters");
    expect(result).toEqual({ error: "Non authentifié" });
  });
});
