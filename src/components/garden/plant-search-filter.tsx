"use client";

import { useState, useEffect } from "react";
import { addPlant } from "@/app/garden/actions";
import { getEffectiveLifecycleDurations, DEFAULT_INDOOR_DAYS } from "@/lib/lifecycle-calc";

interface Plant {
  id: number;
  name: string;
  spacing_cm: number | null;
  row_spacing_cm: number | null;
  sun_exposure: string | null;
  frost_tolerance: string | null;
  default_indoor_to_transplant?: number | null;
}

interface CalendarEntry {
  plant_id: number;
  outdoor_sow_start: number | null;
  outdoor_sow_end: number | null;
  indoor_sow_start: number | null;
  indoor_sow_end: number | null;
  days_to_maturity_min: number | null;
  days_to_maturity_max: number | null;
}

interface PlantSearchFilterProps {
  plants: Plant[];
  gardenId: number;
  gardenPlantIds: number[];
  companionData: Array<{
    candidatePlantId: number;
    relationship: "beneficial" | "antagonistic";
    reason: string | null;
    gardenPlantName: string;
  }>;
  calendarData?: Record<number, CalendarEntry>;
  currentWeek?: number;
  zone?: string;
  indoorDurations?: Record<number, number>;
}

const sunLabels: Record<string, string> = {
  soleil: "Plein soleil",
  mi_ombre: "Mi-ombre",
  ombre: "Ombre",
};

const frostLabels: Record<string, string> = {
  hardy: "Résistant au gel",
  semi_hardy: "Semi-résistant",
  tender: "Sensible au gel",
};

function dateToWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.getMonth();
  const day = date.getDate();

  if (month < 1) return 1;
  if (month > 9) return 35;

  const MONTH_STARTS: [number, number][] = [
    [1, 1],
    [4, 2],
    [8, 3],
    [12, 4],
    [16, 5],
    [20, 6],
    [24, 7],
    [28, 8],
    [32, 9],
  ];

  const entry = MONTH_STARTS.find(([, m]) => m === month);
  if (!entry) return 1;

  const startWeek = entry[0];

  if (month === 1) {
    if (day < 8) return 1;
    const weekInMonth = Math.floor((day - 8) / 7);
    return Math.min(startWeek + weekInMonth, 3);
  }

  const weekInMonth = Math.floor((day - 1) / 7);
  return Math.max(1, Math.min(35, startWeek + weekInMonth));
}

function formatDate(dateStr: string, daysToAdd: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + daysToAdd);
  const months = [
    "jan", "fév", "mars", "avr", "mai", "juin",
    "juil", "août", "sep", "oct", "nov", "déc",
  ];
  return `~${date.getDate()} ${months[date.getMonth()]}`;
}

export function PlantSearchFilter({
  plants,
  gardenId,
  gardenPlantIds,
  companionData,
  calendarData = {},
  indoorDurations = {},
}: PlantSearchFilterProps) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [plantedDates, setPlantedDates] = useState<Record<number, string>>({});
  const [sowingTypes, setSowingTypes] = useState<Record<number, "indoor" | "outdoor">>({});
  const [manualOverrides, setManualOverrides] = useState<Set<number>>(new Set());

  const filtered = plants.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  function getQuantity(plantId: number) {
    return quantities[plantId] ?? 1;
  }

  function getPlantedDate(plantId: number) {
    return plantedDates[plantId] ?? todayISO;
  }

  function detectSowingType(
    plantId: number,
    dateStr: string
  ): "indoor" | "outdoor" | null {
    const cal = calendarData[plantId];
    if (!cal) return null;

    const hasOutdoor = cal.outdoor_sow_start !== null;
    const hasIndoor = cal.indoor_sow_start !== null;

    if (!hasOutdoor && !hasIndoor) return null;

    if (!hasOutdoor) return "indoor";

    const week = dateToWeek(dateStr);

    if (cal.outdoor_sow_start !== null && week < cal.outdoor_sow_start) {
      return "indoor";
    }

    if (
      cal.outdoor_sow_start !== null &&
      week >= cal.outdoor_sow_start &&
      (cal.outdoor_sow_end === null || week <= cal.outdoor_sow_end)
    ) {
      return "outdoor";
    }

    return "indoor";
  }

  function shouldShowToggle(plantId: number): boolean {
    const cal = calendarData[plantId];
    if (!cal) return false;
    return cal.outdoor_sow_start !== null || cal.indoor_sow_start !== null;
  }

  useEffect(() => {
    const updates: Record<number, "indoor" | "outdoor"> = {};
    for (const plant of plants) {
      if (manualOverrides.has(plant.id)) continue;
      const dateStr = plantedDates[plant.id] ?? todayISO;
      const detected = detectSowingType(plant.id, dateStr);
      if (detected !== null) {
        updates[plant.id] = detected;
      }
    }
    if (Object.keys(updates).length > 0) {
      setSowingTypes((prev) => ({ ...prev, ...updates }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantedDates, plants]);

  function handleDateChange(plantId: number, dateStr: string) {
    setPlantedDates((prev) => ({ ...prev, [plantId]: dateStr }));
    if (!manualOverrides.has(plantId)) {
      const detected = detectSowingType(plantId, dateStr);
      if (detected !== null) {
        setSowingTypes((prev) => ({ ...prev, [plantId]: detected }));
      }
    }
  }

  function handleSowingTypeChange(plantId: number, type: "indoor" | "outdoor") {
    setSowingTypes((prev) => ({ ...prev, [plantId]: type }));
    setManualOverrides((prev) => new Set(prev).add(plantId));
  }

  function getLifecyclePreview(plantId: number): {
    d1: number | null;
    d1Accl: number | null;
    d2: number | null;
    d3: number | null;
    transplantDate: string | null;
  } | null {
    const sowingType = sowingTypes[plantId];
    if (!sowingType) return null;

    const cal = calendarData[plantId] ?? null;
    const defaultIndoorDays = indoorDurations[plantId] ?? null;

    const plant = plants.find((p) => p.id === plantId);
    const d1Raw = null;
    const d2Raw = null;
    const d3Raw = null;

    const calForLifecycle = cal
      ? {
          days_to_maturity_min: cal.days_to_maturity_min,
          days_to_maturity_max: cal.days_to_maturity_max,
          indoor_sow_start: cal.indoor_sow_start,
          indoor_sow_end: cal.indoor_sow_end,
          outdoor_sow_start: cal.outdoor_sow_start,
          outdoor_sow_end: cal.outdoor_sow_end,
          transplant_start: null,
          transplant_end: null,
          garden_transplant_start: null,
          garden_transplant_end: null,
          harvest_start: null,
          harvest_end: null,
          depth_mm: null,
          germination_temp_min: null,
          germination_temp_max: null,
          sowing_method: null,
          luminosity: null,
          height_cm: null,
        }
      : null;

    void plant;

    const durations = getEffectiveLifecycleDurations(
      d1Raw,
      d2Raw,
      d3Raw,
      sowingType,
      calForLifecycle,
      defaultIndoorDays
    );

    const dateStr = plantedDates[plantId] ?? todayISO;
    const totalDaysToTransplant =
      (durations.d1 ?? 0) + (durations.d1Accl ?? 0) + (durations.d2 ?? 0);

    return {
      d1: durations.d1,
      d1Accl: durations.d1Accl,
      d2: durations.d2,
      d3: durations.d3,
      transplantDate:
        totalDaysToTransplant > 0
          ? formatDate(dateStr, totalDaysToTransplant)
          : null,
    };
  }

  async function handleAdd(plantId: number) {
    setPending(plantId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[plantId];
      return next;
    });
    const qty = getQuantity(plantId);
    const date = getPlantedDate(plantId);
    const sowingType = sowingTypes[plantId] ?? undefined;
    const result = await addPlant(gardenId, plantId, qty, date, sowingType);
    setPending(null);
    if (result?.error) {
      setErrors((prev) => ({ ...prev, [plantId]: result.error }));
    } else {
      setAdded((prev) => new Set(prev).add(plantId));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Rechercher une plante..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((plant) => {
          const isAdded = added.has(plant.id) || gardenPlantIds.includes(plant.id);
          const isAlreadyInGarden =
            gardenPlantIds.includes(plant.id) && !added.has(plant.id);

          const companions = companionData.filter(
            (c) => c.candidatePlantId === plant.id
          );
          const beneficial = companions.filter(
            (c) => c.relationship === "beneficial"
          );
          const antagonistic = companions.filter(
            (c) => c.relationship === "antagonistic"
          );

          const qty = getQuantity(plant.id);
          const showToggle = !isAdded && shouldShowToggle(plant.id);
          const currentSowingType = sowingTypes[plant.id];
          const preview = showToggle && currentSowingType ? getLifecyclePreview(plant.id) : null;
          const dateStr = getPlantedDate(plant.id);

          const isEarlyForOutdoor = (() => {
            const cal = calendarData[plant.id];
            if (!cal || !cal.outdoor_sow_start) return false;
            const week = dateToWeek(dateStr);
            return week < cal.outdoor_sow_start;
          })();

          return (
            <div
              key={plant.id}
              className="bg-white border border-[#E8E4DE] rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-[#2A2622] text-sm"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    {plant.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {plant.spacing_cm && plant.row_spacing_cm && (
                      <span className="text-xs text-[#7D766E]">
                        {plant.spacing_cm} × {plant.row_spacing_cm} cm
                      </span>
                    )}
                    {plant.sun_exposure && (
                      <span className="text-xs text-[#7D766E]">
                        {sunLabels[plant.sun_exposure] ?? plant.sun_exposure}
                      </span>
                    )}
                    {plant.frost_tolerance && (
                      <span className="text-xs text-[#7D766E]">
                        {frostLabels[plant.frost_tolerance] ??
                          plant.frost_tolerance}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isAdded && (
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => handleDateChange(plant.id, e.target.value)}
                      className="px-2 py-1 border border-[#E8E4DE] rounded-lg text-xs text-[#5C5650] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                    />
                  )}
                  {!isAdded && (
                    <div className="flex items-center border border-[#E8E4DE] rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [plant.id]: Math.max(1, qty - 1),
                          }))
                        }
                        className="px-2 py-1 text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuantities((prev) => ({
                            ...prev,
                            [plant.id]: Math.max(1, val),
                          }));
                        }}
                        className="w-10 text-center text-sm border-x border-[#E8E4DE] py-1 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [plant.id]: qty + 1,
                          }))
                        }
                        className="px-2 py-1 text-sm text-[#5C5650] hover:bg-[#F5F2EE] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleAdd(plant.id)}
                    disabled={isAdded || pending === plant.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isAdded
                        ? "bg-[#F5F2EE] text-[#7D766E] cursor-default"
                        : "bg-[#2D5A3D] hover:bg-[#3D7A52] text-white"
                    }`}
                  >
                    {pending === plant.id
                      ? "..."
                      : isAlreadyInGarden
                      ? "Déjà ajouté"
                      : isAdded
                      ? `Ajouté ✓ (×${qty})`
                      : "Ajouter"}
                  </button>
                </div>
              </div>

              {showToggle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#7D766E]">Type de semis :</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`sowing-type-${plant.id}`}
                        value="indoor"
                        checked={currentSowingType === "indoor"}
                        onChange={() => handleSowingTypeChange(plant.id, "indoor")}
                        className="accent-[#2D5A3D]"
                      />
                      <span className="text-xs text-[#3D3832]">Intérieur</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`sowing-type-${plant.id}`}
                        value="outdoor"
                        checked={currentSowingType === "outdoor"}
                        onChange={() => handleSowingTypeChange(plant.id, "outdoor")}
                        className="accent-[#2D5A3D]"
                      />
                      <span className="text-xs text-[#3D3832]">Extérieur</span>
                    </label>
                    {isEarlyForOutdoor && currentSowingType === "indoor" && (
                      <span className="text-xs text-[#D4973B]">Trop tôt pour semer dehors</span>
                    )}
                  </div>

                  {preview && (
                    <div className="bg-[#F5F2EE] rounded-lg px-3 py-2 space-y-1">
                      <div className="flex items-center gap-1 flex-wrap text-xs text-[#5C5650]">
                        {preview.d1 !== null && (
                          <>
                            <span>🌱 {preview.d1}j</span>
                            {preview.d1Accl !== null && (
                              <>
                                <span className="text-[#A9A29A]">→</span>
                                <span>🌿 {preview.d1Accl}j accl.</span>
                              </>
                            )}
                            {preview.d3 !== null && (
                              <>
                                <span className="text-[#A9A29A]">→</span>
                                <span>🏡 {preview.d3}j</span>
                              </>
                            )}
                          </>
                        )}
                        {preview.d1 === null && preview.d3 !== null && (
                          <span>🏡 {preview.d3}j</span>
                        )}
                      </div>
                      {preview.transplantDate && (
                        <p className="text-xs text-[#7D766E]">
                          Transplantation estimée : {preview.transplantDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {errors[plant.id] && (
                <p className="text-xs text-[#C4463A]">{errors[plant.id]}</p>
              )}

              {(beneficial.length > 0 || antagonistic.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {beneficial.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#DCFCE7] text-[#166534]"
                      title={c.reason ?? undefined}
                    >
                      ✓ {c.gardenPlantName}
                    </span>
                  ))}
                  {antagonistic.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#FEE2E2] text-[#991B1B]"
                      title={c.reason ?? undefined}
                    >
                      ✗ {c.gardenPlantName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[#7D766E] py-8 text-sm">
          Aucune plante trouvée pour &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
