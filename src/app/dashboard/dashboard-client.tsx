"use client";

import { useState, useTransition } from "react";
import { advancePhase } from "@/app/garden/actions";
import { logStep } from "@/app/garden/[id]/actions";
import Link from "next/link";
import { CalendarTimeline } from "@/components/dashboard/calendar-timeline";
import { CalendarLegend } from "@/components/dashboard/legend";
import { PlantSheet } from "@/components/dashboard/plant-sheet";
import { phaseOrder, phaseConfig, stepTypeLabels, getRepiquageStatus } from "@/lib/phase-utils";
import { generateTip, type TipContext } from "@/lib/tip-templates";
import type { UnitPreference } from "@/lib/units";
import { fromMeters } from "@/lib/units";
import type { PlantCalendar } from "@/lib/plant-utils";

interface TrackingPlant {
  id: number;
  plantId: number;
  name: string;
  emoji: string;
  plantedDate: string | null;
  hasBiologyData: boolean;
  daysSincePlanted: number;
  currentSegment: {
    label: string;
    color: string;
    startDay: number;
    endDay: number;
  } | null;
  currentSegmentProgress: number;
  currentSegmentTotal: number;
  overallPercent: number | null;
  isComplete: boolean;
  isOverdue: boolean;
  segments: Array<{
    label: string;
    color: string;
    startDay: number;
    endDay: number;
  }>;
  calendar: PlantCalendar | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  frostTolerance: string | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
  quantity: number;
  nextPhaseAction: "repiquage" | "transplant" | null;
  gardenActions: readonly string[] | null;
}

interface MonPotagerPlant {
  userPlantId: number;
  plantId: number;
  name: string;
  emoji: string;
  status: { label: string; bg: string; color: string };
  calendar: PlantCalendar | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  frostTolerance: string | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
}

interface CalendarTimelinePlant {
  id: number;
  name: string;
  quantity: number;
  plantedDate: string | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
  calendar: PlantCalendar | null;
}

interface OverdueStep {
  id: number;
  stepType: string;
  nextActionDate: string | null;
  plantName: string;
  userPlantId: number;
}

interface ThisWeekRow {
  id: number;
  name: string;
  plantedDate: string | null;
  daysIndoorToRepiquage: number | null;
  frostTolerance: string | null;
  spacingCm: number | null;
  rowSpacingCm: number | null;
  calData: {
    germinationTempMin: number | null;
    germinationTempMax: number | null;
    depthMm: number | null;
    sowingMethod: string | null;
    heightCm: number | null;
    daysToMaturityMin: number | null;
    daysToMaturityMax: number | null;
  };
}

interface PastObservation {
  content: string;
  year: number;
  week_number: number;
  plantId: number | null;
  plantName: string;
}

interface DashboardClientProps {
  frenchDate: string;
  weekLabel: string;
  zone: string;
  offSeason: boolean;
  weeksUntilSeason: number;
  overdueSteps: OverdueStep[];
  trackingPlants: TrackingPlant[];
  monPotagerPlants: MonPotagerPlant[];
  spacePercent: number | null;
  usedAreaM2: number;
  totalAreaM2: number | null;
  unitPref: UnitPreference;
  areaUnitLabel: string;
  primaryGardenId: number | null;
  calendarTimelinePlants: CalendarTimelinePlant[];
  currentWeek: number;
  hasNextWeekTasks: boolean;
  thisWeekByPhase: Record<string, ThisWeekRow[]>;
  nextWeekByPhase: Record<string, Array<{ id: number; name: string }>>;
  pastObservations: PastObservation[];
  currentYear: number;
}

function ProgressBar({
  percent,
  isComplete,
  isOverdue,
  color,
}: {
  percent: number;
  isComplete: boolean;
  isOverdue: boolean;
  color?: string;
}) {
  const barColor = isComplete
    ? "#3D8B5D"
    : isOverdue
    ? "#C4463A"
    : color ?? "#2D5A3D";

  return (
    <div className="w-full bg-[#F5F2EE] rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{
          width: `${Math.min(100, percent)}%`,
          backgroundColor: barColor,
        }}
      />
    </div>
  );
}

export function DashboardClient({
  frenchDate,
  weekLabel,
  zone,
  offSeason,
  weeksUntilSeason,
  overdueSteps,
  trackingPlants,
  monPotagerPlants,
  spacePercent,
  usedAreaM2,
  totalAreaM2,
  unitPref,
  areaUnitLabel,
  primaryGardenId,
  calendarTimelinePlants,
  currentWeek,
  hasNextWeekTasks,
  thisWeekByPhase,
  nextWeekByPhase,
  pastObservations,
  currentYear,
}: DashboardClientProps) {
  const [selectedPlant, setSelectedPlant] = useState<MonPotagerPlant | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [advancingPlantId, setAdvancingPlantId] = useState<number | null>(null);
  const [quantityPickerFor, setQuantityPickerFor] = useState<number | null>(null);
  const [pickerQuantity, setPickerQuantity] = useState(1);
  const [doneAction, setDoneAction] = useState<string | null>(null);

  const hasThisWeekTasks = Object.keys(thisWeekByPhase).length > 0;

  const sheetData = selectedPlant
    ? {
        userPlantId: selectedPlant.userPlantId,
        plantId: selectedPlant.plantId,
        name: selectedPlant.name,
        emoji: selectedPlant.emoji,
        calendar: selectedPlant.calendar,
        spacingCm: selectedPlant.spacingCm,
        rowSpacingCm: selectedPlant.rowSpacingCm,
        frostTolerance: selectedPlant.frostTolerance,
        daysIndoorToRepiquage: selectedPlant.daysIndoorToRepiquage,
        daysRepiquageToTransplant: selectedPlant.daysRepiquageToTransplant,
        daysTransplantToHarvest: selectedPlant.daysTransplantToHarvest,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Tableau de bord
          </h1>
          <p className="text-sm text-[#7D766E] mt-1">
            {frenchDate} — {weekLabel}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#2D5A3D]/10 text-[#2D5A3D]">
          Zone {zone === "zone_3_4" ? "3-4" : "5-6"}
        </span>
      </div>

      {overdueSteps.length > 0 && (
        <div className="bg-white rounded-xl border-l-4 border-l-[#C4463A] border-t border-r border-b border-[#E8E4DE] p-4 space-y-3">
          <h2
            className="text-base font-bold text-[#C4463A]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            ⚠️ Actions en retard
          </h2>
          <ul className="space-y-2">
            {overdueSteps.map((step) => (
              <li key={step.id}>
                <Link
                  href={`/garden/${step.userPlantId}`}
                  className="flex items-start justify-between gap-2 group"
                >
                  <span className="text-sm text-[#3D3832]">
                    <span className="font-semibold text-[#2A2622]">
                      {step.plantName}
                    </span>{" "}
                    — {stepTypeLabels[step.stepType] ?? step.stepType}
                  </span>
                  <span className="text-xs text-[#C4463A] whitespace-nowrap">
                    prévu le {step.nextActionDate}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 1: Suivi de mon potager */}
      <section className="bg-white rounded-xl border border-[#E8E4DE] p-4 space-y-4">
        <h2
          className="text-base font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          🌿 Suivi de mon potager
        </h2>

        {offSeason ? (
          <div className="py-4 text-center space-y-2">
            <span className="text-3xl">❄️</span>
            <p className="text-sm text-[#7D766E]">
              Hors saison — la prochaine saison commence dans{" "}
              <span className="font-semibold text-[#3D3832]">
                {weeksUntilSeason} semaine{weeksUntilSeason !== 1 ? "s" : ""}
              </span>
              .
            </p>
          </div>
        ) : trackingPlants.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-[#7D766E]">
              Aucune plante dans votre potager.{" "}
              <Link href="/garden" className="text-[#2D5A3D] hover:underline font-medium">
                Ajouter des plantes →
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trackingPlants.map((plant) => {
              if (!plant.hasBiologyData || plant.plantedDate === null) {
                return (
                  <div key={plant.id} className="flex items-center gap-3 py-1">
                    <span className="text-xl shrink-0">{plant.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#2A2622] truncate">
                        {plant.name}
                      </p>
                      <p className="text-xs text-[#A9A29A] mt-0.5">
                        Date de semis non enregistrée —{" "}
                        <Link
                          href="/garden"
                          className="text-[#2D5A3D] hover:underline"
                        >
                          Ajouter
                        </Link>
                      </p>
                    </div>
                  </div>
                );
              }

              const progressPercent = plant.overallPercent ?? 0;
              const segLabel = plant.currentSegment?.label ?? "En cours";
              const phaseColor = plant.currentSegment?.color;

              let countdownText = "";
              if (plant.isComplete) {
                countdownText = "Terminé ✓";
              } else if (plant.currentSegment) {
                const daysLeft =
                  plant.currentSegment.endDay -
                  plant.currentSegment.startDay -
                  plant.currentSegmentProgress;
                if (plant.isOverdue) {
                  countdownText = `En retard de ${Math.abs(daysLeft)} j`;
                } else {
                  countdownText = `Jour ${plant.currentSegmentProgress + 1} sur ${plant.currentSegmentTotal}`;
                  const segIdx = plant.segments.findIndex(
                    (s) => s.label === plant.currentSegment?.label
                  );
                  if (segIdx !== -1 && segIdx < plant.segments.length - 1) {
                    const nextLabel = plant.segments[segIdx + 1].label;
                    countdownText += ` · ${nextLabel} dans ${daysLeft}j`;
                  }
                }
              }

              return (
                <div key={plant.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{plant.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2A2622] truncate">
                          {plant.name}
                          {plant.quantity > 1 && (
                            <span className="text-[#A9A29A] font-normal"> ×{plant.quantity}</span>
                          )}
                        </p>
                        <p className="text-xs text-[#7D766E]">{segLabel}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: plant.isComplete
                            ? "#3D8B5D"
                            : plant.isOverdue
                            ? "#C4463A"
                            : "#7D766E",
                        }}
                      >
                        {countdownText}
                      </p>
                    </div>
                  </div>
                  <ProgressBar
                    percent={progressPercent}
                    isComplete={plant.isComplete}
                    isOverdue={plant.isOverdue}
                    color={phaseColor}
                  />
                  {plant.nextPhaseAction && (
                    <div className="flex items-center gap-2">
                      {quantityPickerFor === plant.id ? (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[#7D766E]">Quantité :</label>
                          <input
                            type="number"
                            min={1}
                            max={plant.quantity}
                            value={pickerQuantity}
                            onChange={(e) => setPickerQuantity(Math.max(1, Math.min(plant.quantity, Number(e.target.value))))}
                            className="w-14 h-6 text-xs border border-[#E8E4DE] rounded px-1 text-center"
                          />
                          <span className="text-xs text-[#A9A29A]">/ {plant.quantity}</span>
                          <button
                            disabled={isPending}
                            onClick={() => {
                              setAdvancingPlantId(plant.id);
                              startTransition(async () => {
                                await advancePhase(plant.id, plant.nextPhaseAction!, pickerQuantity);
                                setQuantityPickerFor(null);
                                setAdvancingPlantId(null);
                              });
                            }}
                            className="text-xs font-medium text-white bg-[#2D5A3D] hover:bg-[#3D7A52] rounded px-2 py-0.5 transition-colors disabled:opacity-50"
                          >
                            {advancingPlantId === plant.id ? "..." : "OK"}
                          </button>
                          <button
                            onClick={() => setQuantityPickerFor(null)}
                            className="text-xs text-[#A9A29A] hover:text-[#7D766E]"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isPending && advancingPlantId === plant.id}
                          onClick={() => {
                            if (plant.quantity > 1) {
                              setPickerQuantity(plant.quantity);
                              setQuantityPickerFor(plant.id);
                            } else {
                              setAdvancingPlantId(plant.id);
                              startTransition(async () => {
                                await advancePhase(plant.id, plant.nextPhaseAction!);
                                setAdvancingPlantId(null);
                              });
                            }
                          }}
                          className="text-xs font-medium transition-colors disabled:opacity-50"
                          style={{
                            color: plant.segments.find(
                              (s) =>
                                s.label ===
                                (plant.nextPhaseAction === "repiquage"
                                  ? "Repiquage"
                                  : "Au potager")
                            )?.color ?? "#2D5A3D",
                          }}
                        >
                          {advancingPlantId === plant.id
                            ? "..."
                            : plant.nextPhaseAction === "repiquage"
                            ? "Passer au repiquage ›"
                            : "Passer au potager ›"}
                        </button>
                      )}
                    </div>
                  )}
                  {plant.gardenActions && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plant.gardenActions.map((action) => {
                        const key = `${plant.id}-${action}`;
                        const icons: Record<string, string> = {
                          arrosage: "💧",
                          fertilisation: "🌿",
                          entretien: "🔧",
                        };
                        const labels: Record<string, string> = {
                          arrosage: "Arrosage",
                          fertilisation: "Fertilisation",
                          entretien: "Entretien",
                        };
                        const isDone = doneAction === key;
                        return (
                          <button
                            key={action}
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await logStep(
                                  plant.id,
                                  action as "arrosage" | "fertilisation" | "entretien"
                                );
                                setDoneAction(key);
                                setTimeout(() => setDoneAction(null), 2000);
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-[#E8E4DE] hover:bg-[#F5F2EE] transition-colors disabled:opacity-50"
                          >
                            <span>{isDone ? "✓" : icons[action]}</span>
                            <span className="text-[#3D3832]">
                              {isDone ? "Fait!" : labels[action]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* This week / next week panel */}
      {!offSeason && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border-l-4 border-l-[#2D5A3D] border-t border-r border-b border-[#E8E4DE] p-4 space-y-4">
            <h2
              className="text-base font-bold text-[#2D5A3D]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              📋 Cette semaine
            </h2>
            {!hasThisWeekTasks ? (
              <p className="text-sm text-[#7D766E]">
                Rien de prévu cette semaine! 🎉 Profitez du potager.
              </p>
            ) : (
              <div className="space-y-4">
                {phaseOrder.map((phase) => {
                  const rows = thisWeekByPhase[phase];
                  if (!rows || rows.length === 0) return null;
                  const { emoji, label } = phaseConfig[phase];
                  return (
                    <div key={phase}>
                      <p className="text-sm font-semibold text-[#3D3832] mb-2">
                        {emoji} {label}
                      </p>
                      <ul className="space-y-2 pl-5">
                        {rows.map((row) => {
                          const repStatus = getRepiquageStatus(
                            row.plantedDate,
                            row.daysIndoorToRepiquage
                          );
                          const tipCtx: TipContext = {
                            name: row.name,
                            plantedDate: row.plantedDate,
                            daysIndoorToRepiquage: row.daysIndoorToRepiquage,
                            frostTolerance: row.frostTolerance,
                            spacingCm: row.spacingCm,
                            rowSpacingCm: row.rowSpacingCm,
                            germinationTempMin: row.calData.germinationTempMin,
                            germinationTempMax: row.calData.germinationTempMax,
                            depthMm: row.calData.depthMm,
                            sowingMethod: row.calData.sowingMethod,
                            heightCm: row.calData.heightCm,
                            daysToMaturityMin: row.calData.daysToMaturityMin,
                            daysToMaturityMax: row.calData.daysToMaturityMax,
                          };
                          const tip = generateTip(phase, tipCtx, repStatus);
                          return (
                            <li key={row.id} className="text-sm text-[#5C5650]">
                              <Link
                                href={`/garden/${row.id}`}
                                className="font-semibold text-[#2D5A3D] hover:underline"
                              >
                                {row.name}
                              </Link>
                              <span className="block text-xs text-[#7D766E] mt-0.5">
                                {tip}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasNextWeekTasks ? (
            <div className="bg-white rounded-xl border-l-4 border-l-[#D4CFC7] border-t border-r border-b border-[#E8E4DE] p-4 space-y-4">
              <h2
                className="text-base font-bold text-[#7D766E]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                📅 La semaine prochaine
              </h2>
              <div className="space-y-4">
                {phaseOrder.map((phase) => {
                  const rows = nextWeekByPhase[phase];
                  if (!rows || rows.length === 0) return null;
                  const { emoji, label } = phaseConfig[phase];
                  return (
                    <div key={phase}>
                      <p className="text-sm font-medium text-[#5C5650] mb-2">
                        {emoji} {label}
                      </p>
                      <ul className="space-y-1 pl-5">
                        {rows.map((row) => (
                          <li key={row.id} className="text-sm text-[#A9A29A]">
                            <Link
                              href={`/garden/${row.id}`}
                              className="text-[#7D766E] hover:text-[#2D5A3D] hover:underline"
                            >
                              {row.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Section 2: Mon potager */}
      <section className="bg-white rounded-xl border border-[#E8E4DE] p-4 space-y-3">
        <h2
          className="text-base font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          🏡 Mon potager
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
          {monPotagerPlants.map((plant) => (
            <button
              key={plant.userPlantId}
              onClick={() => setSelectedPlant(plant)}
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-[#F5F2EE] transition-colors text-left min-h-[44px] w-full"
            >
              <span className="text-xl shrink-0">{plant.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2A2622] truncate">
                  {plant.name}
                </p>
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5"
                  style={{
                    backgroundColor: plant.status.bg,
                    color: plant.status.color,
                  }}
                >
                  {plant.status.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 3: Espace utilisé */}
      {spacePercent !== null && (
        <section className="bg-white rounded-xl border border-[#E8E4DE] p-4">
          <div className="flex items-center justify-between mb-2">
            {primaryGardenId ? (
              <Link
                href={`/garden/${primaryGardenId}`}
                className="text-sm font-medium text-[#3D3832] hover:text-[#2D5A3D] transition-colors"
              >
                Espace utilisé
              </Link>
            ) : (
              <span className="text-sm font-medium text-[#3D3832]">
                Espace utilisé
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#7D766E]">
                {fromMeters(usedAreaM2, unitPref).toFixed(1)} {areaUnitLabel} /{" "}
                {fromMeters(totalAreaM2 ?? 0, unitPref).toFixed(1)}{" "}
                {areaUnitLabel} ({spacePercent}%)
              </span>
              <Link
                href="/settings"
                className="text-[#7D766E] hover:text-[#2D5A3D] transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Paramètres"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </Link>
            </div>
          </div>
          <div className="w-full bg-[#F5F2EE] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${spacePercent}%`,
                backgroundColor:
                  spacePercent > 90
                    ? "#C4463A"
                    : spacePercent > 70
                    ? "#D4973B"
                    : "#2D5A3D",
              }}
            />
          </div>
        </section>
      )}

      {/* Section 4: Tracking Timeline */}
      <section className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6 space-y-4">
        <h2
          className="text-base font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          📅 Calendrier de la saison
        </h2>
        <CalendarTimeline
          plants={calendarTimelinePlants}
          currentWeek={currentWeek}
        />
        <div className="pt-2 border-t border-[#F5F2EE]">
          <CalendarLegend />
        </div>
        <div className="pt-1">
          <Link
            href="/calendrier"
            className="text-xs text-[#2D5A3D] hover:underline font-medium"
          >
            Voir le calendrier complet →
          </Link>
        </div>
      </section>

      {/* Past observations */}
      {pastObservations.length > 0 && (
        <div className="bg-white rounded-xl border-l-4 border-l-[#D4973B] border-t border-r border-b border-[#E8E4DE] p-4 space-y-3">
          <h2
            className="text-base font-bold text-[#8B6914]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            📓 L&apos;an dernier à cette période
          </h2>
          <ul className="space-y-3">
            {pastObservations.map((obs, i) => {
              const yearsAgo = currentYear - obs.year;
              const yearLabel =
                yearsAgo === 1 ? "L'an dernier" : `Il y a ${yearsAgo} ans`;
              return (
                <li key={i} className="text-sm text-[#5C5650]">
                  <span className="font-semibold text-[#3D3832]">
                    {obs.plantName}
                  </span>{" "}
                  <span className="text-[#A9A29A]">
                    — {yearLabel}, semaine {obs.week_number}
                  </span>
                  <p className="mt-0.5 text-[#5C5650] italic">
                    &ldquo;{obs.content}&rdquo;
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PlantSheet plant={sheetData} onClose={() => setSelectedPlant(null)} />
    </div>
  );
}
