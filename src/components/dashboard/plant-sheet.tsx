"use client";

import { useEffect, useState, useCallback } from "react";
import { getCompanionsForPlant, type CompanionResult } from "@/app/dashboard/actions";
import type { PlantCalendar } from "@/lib/plant-utils";

interface PlantSheetData {
  userPlantId: number;
  plantId: number;
  name: string;
  emoji: string;
  calendar: PlantCalendar | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  frostTolerance: string | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
}

interface PlantSheetProps {
  plant: PlantSheetData | null;
  onClose: () => void;
}

const phaseLabels: Array<{
  label: string;
  startKey: keyof PlantCalendar;
  endKey: keyof PlantCalendar;
  color: string;
}> = [
  {
    label: "Semis intérieur",
    startKey: "indoor_sow_start",
    endKey: "indoor_sow_end",
    color: "#E8912D",
  },
  {
    label: "Repiquage",
    startKey: "transplant_start",
    endKey: "transplant_end",
    color: "#D45FA0",
  },
  {
    label: "Semis extérieur",
    startKey: "outdoor_sow_start",
    endKey: "outdoor_sow_end",
    color: "#D4C24A",
  },
  {
    label: "Au potager",
    startKey: "garden_transplant_start",
    endKey: "garden_transplant_end",
    color: "#4A9E4A",
  },
  {
    label: "Récolte",
    startKey: "harvest_start",
    endKey: "harvest_end",
    color: "#C0392B",
  },
];

const luminosityLabels: Record<string, string> = {
  full_sun: "Plein soleil",
  partial_shade: "Mi-ombre",
  shade: "Ombre",
};

const frostToleranceLabels: Record<string, string> = {
  tender: "Sensible au gel",
  half_hardy: "Semi-rustique",
  hardy: "Rustique",
  very_hardy: "Très rustique",
};

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#F5F2EE] last:border-0">
      <span className="text-sm text-[#7D766E]">{label}</span>
      <span className="text-sm font-medium text-[#3D3832] text-right">{value}</span>
    </div>
  );
}

export function PlantSheet({ plant, onClose }: PlantSheetProps) {
  const [companions, setCompanions] = useState<CompanionResult[]>([]);
  const [loadingCompanions, setLoadingCompanions] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!plant) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [plant, handleKeyDown]);

  useEffect(() => {
    if (!plant) {
      setCompanions([]);
      return;
    }
    setLoadingCompanions(true);
    getCompanionsForPlant(plant.plantId)
      .then(setCompanions)
      .catch(() => setCompanions([]))
      .finally(() => setLoadingCompanions(false));
  }, [plant]);

  if (!plant) return null;

  const cal = plant.calendar;

  const beneficials = companions.filter((c) => c.relationship === "beneficial");
  const antagonistics = companions.filter(
    (c) => c.relationship === "antagonistic"
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Détails de ${plant.name}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F5F2EE]">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{plant.emoji}</span>
            <h2
              className="text-xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {plant.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#7D766E] hover:bg-[#F5F2EE] hover:text-[#3D3832] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          <section>
            <h3
              className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wide mb-3"
              style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              Caractéristiques
            </h3>
            <div>
              {cal?.luminosity && (
                <DataRow
                  label="Luminosité"
                  value={luminosityLabels[cal.luminosity] ?? cal.luminosity}
                />
              )}
              {plant.frostTolerance && (
                <DataRow
                  label="Tolérance au gel"
                  value={
                    frostToleranceLabels[plant.frostTolerance] ??
                    plant.frostTolerance
                  }
                />
              )}
              {cal?.depth_mm && (
                <DataRow label="Profondeur de semis" value={`${cal.depth_mm} mm`} />
              )}
              {(cal?.germination_temp_min || cal?.germination_temp_max) && (
                <DataRow
                  label="Temp. germination"
                  value={
                    cal.germination_temp_min && cal.germination_temp_max
                      ? `${cal.germination_temp_min}–${cal.germination_temp_max}°C`
                      : cal.germination_temp_min
                      ? `min. ${cal.germination_temp_min}°C`
                      : `max. ${cal.germination_temp_max}°C`
                  }
                />
              )}
              {cal?.sowing_method && (
                <DataRow label="Méthode de semis" value={cal.sowing_method} />
              )}
              {cal?.height_cm && (
                <DataRow label="Hauteur" value={`${cal.height_cm} cm`} />
              )}
              {plant.spacingCm && (
                <DataRow label="Espacement" value={`${plant.spacingCm} cm`} />
              )}
              {plant.rowSpacingCm && (
                <DataRow label="Entre-rangs" value={`${plant.rowSpacingCm} cm`} />
              )}
              {(cal?.days_to_maturity_min || cal?.days_to_maturity_max) && (
                <DataRow
                  label="Jours à maturité"
                  value={
                    cal.days_to_maturity_min && cal.days_to_maturity_max
                      ? `${cal.days_to_maturity_min}–${cal.days_to_maturity_max} jours`
                      : cal.days_to_maturity_min
                      ? `${cal.days_to_maturity_min} jours`
                      : `${cal.days_to_maturity_max} jours`
                  }
                />
              )}
            </div>
          </section>

          {cal && (
            <section>
              <h3
                className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wide mb-3"
                style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                Calendrier des phases
              </h3>
              <div className="space-y-2">
                {phaseLabels.map((phase) => {
                  const start = cal[phase.startKey] as number | null;
                  const end = cal[phase.endKey] as number | null;
                  if (start === null || end === null) return null;
                  return (
                    <div
                      key={phase.label}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="text-sm text-[#5C5650]">
                          {phase.label}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#3D3832] whitespace-nowrap">
                        sem. {start}–{end}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(beneficials.length > 0 || antagonistics.length > 0 || loadingCompanions) && (
            <section>
              <h3
                className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wide mb-3"
                style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                Compagnonnage
              </h3>
              {loadingCompanions ? (
                <p className="text-sm text-[#A9A29A]">Chargement…</p>
              ) : (
                <div className="space-y-2">
                  {beneficials.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#2D5A3D] shrink-0 mt-0.5">
                        Bon compagnon
                      </span>
                      <div>
                        <span className="text-sm font-medium text-[#3D3832]">
                          {c.name}
                        </span>
                        {c.reason && (
                          <p className="text-xs text-[#7D766E] mt-0.5">{c.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {antagonistics.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#C4463A] shrink-0 mt-0.5">
                        À éviter
                      </span>
                      <div>
                        <span className="text-sm font-medium text-[#3D3832]">
                          {c.name}
                        </span>
                        {c.reason && (
                          <p className="text-xs text-[#7D766E] mt-0.5">{c.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
