"use client";

import { useEffect, useState } from "react";

interface ForecastDay {
  day: string;
  temp: number;
  min: number;
  max: number;
  description: string;
}

interface WeatherData {
  current_temp: number;
  description: string;
  city: string;
  min: number;
  max: number;
  forecast: ForecastDay[];
  frost_warning: boolean;
}

interface WeatherError {
  error: string;
}

type WeatherResult = WeatherData | WeatherError;

function isError(data: WeatherResult): data is WeatherError {
  return "error" in data;
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

interface WeatherWidgetProps {
  lat: number;
  lon: number;
}

export function WeatherWidget({ lat, lon }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data: WeatherResult) => {
        setWeather(data);
        setLoading(false);
      })
      .catch(() => {
        setWeather({ error: "fetch_failed" });
        setLoading(false);
      });
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#F5F2EE] rounded w-1/3" />
          <div className="h-12 bg-[#F5F2EE] rounded w-1/4" />
          <div className="h-4 bg-[#F5F2EE] rounded w-1/2" />
          <div className="flex gap-2 mt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-[#F5F2EE] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!weather || isError(weather)) {
    const isNotConfigured = weather && isError(weather) && weather.error === "non_configure";
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6">
        <p className="text-sm text-[#A9A29A]">
          {isNotConfigured ? "Météo non configurée" : "Météo non disponible"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6 space-y-4">
      {weather.frost_warning && (
        <div className="flex items-center gap-2 bg-[#4A7FA5]/10 border border-[#4A7FA5]/30 rounded-lg px-3 py-2">
          <span className="text-base">🌡️</span>
          <p className="text-sm font-medium text-[#4A7FA5]">
            Gel prévu cette nuit — protégez vos semis
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#7D766E] uppercase tracking-wide">
            {weather.city}
          </p>
          <p
            className="text-5xl font-bold text-[#2A2622] leading-none mt-1"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {weather.current_temp}°
          </p>
          <p className="text-sm text-[#5C5650] mt-1 capitalize">{weather.description}</p>
          <p className="text-xs text-[#A9A29A] mt-0.5">
            {weather.min}° / {weather.max}°
          </p>
        </div>
        <span className="text-4xl leading-none">
          {descriptionToEmoji(weather.description)}
        </span>
      </div>

      {weather.forecast.length > 0 && (
        <div className="pt-3 border-t border-[#F5F2EE]">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weather.forecast.map((day, i) => (
              <div
                key={i}
                className="flex-1 min-w-[44px] flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-[#FAF8F5]"
              >
                <span className="text-xs font-medium text-[#7D766E]">{day.day}</span>
                <span className="text-base leading-none">{descriptionToEmoji(day.description)}</span>
                <span className="text-xs font-semibold text-[#3D3832]">{day.temp}°</span>
                <span className="text-xs text-[#A9A29A]">{day.min}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
