import { NextRequest, NextResponse } from "next/server";

const weatherCache = new Map<string, { data: WeatherResponse; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

interface ForecastDay {
  day: string;
  temp: number;
  min: number;
  max: number;
  description: string;
}

interface WeatherResponse {
  current_temp: number;
  description: string;
  city: string;
  min: number;
  max: number;
  forecast: ForecastDay[];
  frost_warning: boolean;
}

function descriptionToEmoji(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("thunderstorm")) return "⛈️";
  if (lower.includes("drizzle")) return "🌦️";
  if (lower.includes("rain")) return "🌧️";
  if (lower.includes("snow")) return "❄️";
  if (lower.includes("mist") || lower.includes("fog") || lower.includes("haze")) return "🌫️";
  if (lower.includes("clear")) return "☀️";
  if (lower.includes("few clouds")) return "🌤️";
  if (lower.includes("scattered clouds")) return "⛅";
  if (lower.includes("cloud")) return "☁️";
  return "🌡️";
}

function getDayName(timestamp: number, timezoneOffset: number): string {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return days[date.getUTCDay()];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat et lon sont requis" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "non_configure" }, { status: 503 });
  }

  const cacheKey = `${lat},${lon}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`
      ),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error("OpenWeatherMap API error");
    }

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    const timezoneOffset: number = currentData.timezone ?? 0;

    const dailyMap = new Map<string, { temps: number[]; min: number; max: number; description: string }>();

    for (const item of forecastData.list) {
      const date = new Date((item.dt + timezoneOffset) * 1000);
      const dateKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          temps: [],
          min: item.main.temp_min,
          max: item.main.temp_max,
          description: item.weather[0]?.description ?? "",
        });
      }
      const day = dailyMap.get(dateKey)!;
      day.temps.push(item.main.temp);
      day.min = Math.min(day.min, item.main.temp_min);
      day.max = Math.max(day.max, item.main.temp_max);
      if (item.dt_txt?.includes("12:00:00")) {
        day.description = item.weather[0]?.description ?? day.description;
      }
    }

    const forecast: ForecastDay[] = [];
    let dayCount = 0;
    for (const [, day] of dailyMap) {
      if (dayCount >= 7) break;
      const firstDt = forecastData.list.find((item: { dt: number }) => {
        const date = new Date((item.dt + timezoneOffset) * 1000);
        const dateKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
        return dateKey === [...dailyMap.keys()][dayCount];
      });
      forecast.push({
        day: getDayName(firstDt?.dt ?? 0, timezoneOffset),
        temp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
        min: Math.round(day.min),
        max: Math.round(day.max),
        description: day.description,
      });
      dayCount++;
    }

    const todayMin = currentData.main.temp_min;
    const forecastMinTemps = forecast.map((d) => d.min);
    const allMins = [todayMin, ...forecastMinTemps];
    const frost_warning = allMins.some((t) => t < 0);

    const response: WeatherResponse = {
      current_temp: Math.round(currentData.main.temp),
      description: currentData.weather[0]?.description ?? "",
      city: currentData.name ?? "",
      min: Math.round(currentData.main.temp_min),
      max: Math.round(currentData.main.temp_max),
      forecast,
      frost_warning,
    };

    weatherCache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (err) {
    if (cached) {
      return NextResponse.json(cached.data);
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export { descriptionToEmoji };
