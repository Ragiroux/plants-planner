"use client";

import { useState } from "react";
import { addPlant } from "@/app/garden/actions";

interface Plant {
  id: number;
  name: string;
  spacing_cm: number | null;
  row_spacing_cm: number | null;
  sun_exposure: string | null;
  frost_tolerance: string | null;
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

export function PlantSearchFilter({
  plants,
  gardenId,
  gardenPlantIds,
  companionData,
}: PlantSearchFilterProps) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [plantedDates, setPlantedDates] = useState<Record<number, string>>({});

  const filtered = plants.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  function getQuantity(plantId: number) {
    return quantities[plantId] ?? 1;
  }

  function getPlantedDate(plantId: number) {
    return plantedDates[plantId] ?? todayISO;
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
    const result = await addPlant(gardenId, plantId, qty, date);
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
                      value={getPlantedDate(plant.id)}
                      onChange={(e) =>
                        setPlantedDates((prev) => ({
                          ...prev,
                          [plant.id]: e.target.value,
                        }))
                      }
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
