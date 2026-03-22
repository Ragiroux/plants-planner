import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      plant_calendars: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/calendar-utils", () => ({
  getCurrentWeek: vi.fn().mockReturnValue(10),
  getWeekLabel: vi.fn().mockReturnValue("Mars, semaine 3"),
}));

describe("Cron notification route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { POST } = await import("../cron/route");
    const req = new Request("http://localhost/api/cron", { method: "POST" });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization token is wrong", async () => {
    const { POST } = await import("../cron/route");
    const req = new Request("http://localhost/api/cron", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env var is not set", async () => {
    delete process.env.CRON_SECRET;
    vi.resetModules();

    const { POST } = await import("../cron/route");
    const req = new Request("http://localhost/api/cron", {
      method: "POST",
      headers: { Authorization: "Bearer some-token" },
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(401);
  });

  it("returns 200 with summary when authorized", async () => {
    process.env.CRON_SECRET = "valid-secret";

    const { POST } = await import("../cron/route");
    const req = new Request("http://localhost/api/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-secret" },
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("users_processed");
    expect(data).toHaveProperty("messages_sent");
    expect(data).toHaveProperty("failures");
  });

  it("processes no users when none have slack_webhook", async () => {
    process.env.CRON_SECRET = "valid-secret";
    const { db } = await import("@/lib/db");
    vi.mocked(db.query.users.findMany).mockResolvedValue([]);

    const { POST } = await import("../cron/route");
    const req = new Request("http://localhost/api/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-secret" },
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    const data = await res.json();

    expect(data.users_processed).toBe(0);
    expect(data.messages_sent).toBe(0);
    expect(data.failures).toBe(0);
  });
});
