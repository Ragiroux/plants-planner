"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  current_temp: number;
  description: string;
  city: string;
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
  return "";
}

interface HeaderWeatherProps {
  lat: number;
  lon: number;
}

export function HeaderWeather({ lat, lon }: HeaderWeatherProps) {
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
      <div className="flex items-center gap-1.5 animate-pulse">
        <div className="h-4 w-4 bg-[#E8E4DE] rounded" />
        <div className="h-3 w-12 bg-[#E8E4DE] rounded" />
      </div>
    );
  }

  if (!weather || isError(weather)) {
    return null;
  }

  const emoji = descriptionToEmoji(weather.description);
  const title = `${weather.city} — ${weather.description}, ${weather.current_temp}°C${weather.frost_warning ? " · Risque de gel" : ""}`;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors cursor-default select-none"
      title={title}
    >
      <span className="leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="font-medium text-[#2A2622]">{weather.current_temp}°</span>
      <span className="hidden sm:inline text-[#7D766E] text-xs">{weather.city}</span>
      {weather.frost_warning && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A7FA5] flex-shrink-0"
          title="Risque de gel"
          aria-label="Risque de gel"
        />
      )}
    </div>
  );
}
