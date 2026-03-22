import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

process.env.OPENWEATHERMAP_API_KEY = "test-api-key";

const mockCurrentResponse = {
  name: "Montréal",
  timezone: -18000,
  main: { temp: 12, temp_min: 4, temp_max: 18 },
  weather: [{ description: "ciel dégagé" }],
};

const mockForecastResponse = {
  list: [
    {
      dt: 1700000000,
      dt_txt: "2023-11-15 12:00:00",
      main: { temp: 10, temp_min: 5, temp_max: 15 },
      weather: [{ description: "nuageux" }],
    },
    {
      dt: 1700086400,
      dt_txt: "2023-11-16 12:00:00",
      main: { temp: -2, temp_min: -5, temp_max: 1 },
      weather: [{ description: "neige" }],
    },
  ],
};

function makeJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

describe("Weather API route", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns weather data on successful API call", async () => {
    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(mockCurrentResponse))
      .mockResolvedValueOnce(makeJsonResponse(mockForecastResponse));

    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=45.5&lon=-73.5");
    const res = await GET(req as Parameters<typeof GET>[0]);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.current_temp).toBe(12);
    expect(data.city).toBe("Montréal");
    expect(data.description).toBe("ciel dégagé");
  });

  it("detects frost warning when min temp is below 0", async () => {
    const coldCurrentResponse = {
      ...mockCurrentResponse,
      main: { temp: 2, temp_min: -3, temp_max: 5 },
    };

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(coldCurrentResponse))
      .mockResolvedValueOnce(makeJsonResponse(mockForecastResponse));

    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=45.5&lon=-73.5");
    const res = await GET(req as Parameters<typeof GET>[0]);
    const data = await res.json();

    expect(data.frost_warning).toBe(true);
  });

  it("does not set frost warning when all temps are above 0", async () => {
    const warmForecast = {
      list: [
        {
          dt: 1700000000,
          dt_txt: "2023-11-15 12:00:00",
          main: { temp: 15, temp_min: 8, temp_max: 22 },
          weather: [{ description: "ensoleillé" }],
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(mockCurrentResponse))
      .mockResolvedValueOnce(makeJsonResponse(warmForecast));

    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=45.5&lon=-73.5");
    const res = await GET(req as Parameters<typeof GET>[0]);
    const data = await res.json();

    expect(data.frost_warning).toBe(false);
  });

  it("returns 400 when lat or lon are missing", async () => {
    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=45.5");
    const res = await GET(req as Parameters<typeof GET>[0]);

    expect(res.status).toBe(400);
  });

  it("returns 503 when OPENWEATHERMAP_API_KEY is not set", async () => {
    const originalKey = process.env.OPENWEATHERMAP_API_KEY;
    delete process.env.OPENWEATHERMAP_API_KEY;

    vi.resetModules();
    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=45.5&lon=-73.5");
    const res = await GET(req as Parameters<typeof GET>[0]);

    expect(res.status).toBe(503);
    process.env.OPENWEATHERMAP_API_KEY = originalKey;
  });

  it("returns 500 with error when API fails and no cache", async () => {
    process.env.OPENWEATHERMAP_API_KEY = "test-api-key";
    mockFetch.mockRejectedValue(new Error("Network error"));

    vi.resetModules();
    const { GET } = await import("../weather/route");
    const req = new Request("http://localhost/api/weather?lat=99.9&lon=99.9");
    const res = await GET(req as Parameters<typeof GET>[0]);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
