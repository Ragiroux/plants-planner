"use client";

import { useState, useTransition } from "react";
import { advancePhase } from "@/app/garden/actions";
import { logStep } from "@/app/garden/[id]/actions";
import Link from "next/link";
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
  sowingType: "indoor" | "outdoor" | null;
  upcomingTransition: { label: string; daysUntil: number } | null;
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
  spacePercent: number | null;
  usedAreaM2: number;
  totalAreaM2: number | null;
  unitPref: UnitPreference;
  areaUnitLabel: string;
  primaryGardenId: number | null;
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
  spacePercent,
  usedAreaM2,
  totalAreaM2,
  unitPref,
  areaUnitLabel,
  primaryGardenId,
  currentWeek,
  hasNextWeekTasks,
  thisWeekByPhase,
  nextWeekByPhase,
  pastObservations,
  currentYear,
}: DashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [advancingPlantId, setAdvancingPlantId] = useState<number | null>(null);
  const [quantityPickerFor, setQuantityPickerFor] = useState<number | null>(null);
  const [pickerQuantity, setPickerQuantity] = useState(1);
  const [doneAction, setDoneAction] = useState<string | null>(null);

  // All active plants (have biology data, planted, not complete)
  const allActive = trackingPlants.filter(
    (p) => p.hasBiologyData && p.plantedDate !== null && !p.isComplete
  );

  // ACTION NOW: plants with a concrete action to take
  const actionNow = allActive.filter((p) =>
    // Phase is done → advance button ready
    (p.nextPhaseAction && p.currentSegmentProgress >= p.currentSegmentTotal) ||
    // At garden stage → maintenance actions
    p.gardenActions !== null
  );
  const actionNowIds = new Set(actionNow.map((p) => p.id));

  // ACTION SOON: transition within ≤7 days (not already in actionNow)
  const actionSoon = allActive.filter(
    (p) => p.upcomingTransition !== null && !actionNowIds.has(p.id)
  );
  const actionSoonIds = new Set(actionSoon.map((p) => p.id));

  // GROWING: everything else active — just monitoring
  const growing = allActive.filter(
    (p) => !actionNowIds.has(p.id) && !actionSoonIds.has(p.id)
  );

  // Plants without planted date
  const noDate = trackingPlants.filter((p) => !p.plantedDate);

  // thisWeekByPhase rows not covered by any of the above
  const coveredIds = new Set([...actionNowIds, ...actionSoonIds, ...growing.map((p) => p.id)]);
  const thisWeekRows: Array<{ phase: string; row: ThisWeekRow }> = [];
  const seenThisWeek = new Set<number>();
  for (const phase of phaseOrder) {
    const rows = thisWeekByPhase[phase];
    if (!rows) continue;
    for (const row of rows) {
      if (!seenThisWeek.has(row.id) && !coveredIds.has(row.id)) {
        seenThisWeek.add(row.id);
        thisWeekRows.push({ phase, row });
      }
    }
  }

  const hasAnyContent =
    overdueSteps.length > 0 ||
    actionNow.length > 0 ||
    actionSoon.length > 0 ||
    growing.length > 0 ||
    noDate.length > 0 ||
    thisWeekRows.length > 0 ||
    hasNextWeekTasks;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Off-season empty state */}
      {offSeason && (
        <div className="flex justify-center py-16">
          <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-10 max-w-md w-full text-center space-y-3">
            <span className="text-5xl">❄️</span>
            <h2
              className="text-xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Hors saison
            </h2>
            <p className="text-sm text-[#7D766E]">
              La prochaine saison commence dans{" "}
              <span className="font-semibold text-[#3D3832]">
                {weeksUntilSeason} semaine{weeksUntilSeason !== 1 ? "s" : ""}
              </span>
              . Profitez-en pour planifier votre potager!
            </p>
            <Link
              href="/garden"
              className="inline-flex h-11 items-center px-6 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Gérer mon potager
            </Link>
          </div>
        </div>
      )}

      {/* No plants empty state */}
      {!offSeason && trackingPlants.length === 0 && (
        <div className="flex justify-center py-16">
          <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-10 max-w-md w-full text-center space-y-3">
            <span className="text-5xl">🌱</span>
            <h2
              className="text-xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Votre potager est vide
            </h2>
            <p className="text-sm text-[#7D766E]">
              Commencez par ajouter vos premières plantes pour suivre votre
              saison.
            </p>
            <Link
              href="/garden"
              className="inline-flex h-11 items-center px-6 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Ajouter des plantes
            </Link>
          </div>
        </div>
      )}

      {/* Urgency action list */}
      {!offSeason && trackingPlants.length > 0 && (
        <div className="space-y-4">

          {/* EN RETARD */}
          {overdueSteps.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#C4463A] p-4 space-y-3">
              <h2
                className="text-base font-bold text-[#C4463A]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                🚨 En retard
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
            </section>
          )}

          {/* PLANTS WITHOUT DATE */}
          {noDate.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#D4A017] p-4 space-y-3">
              <h2
                className="text-base font-bold text-[#D4A017]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Date de semis manquante
              </h2>
              {noDate.map((plant) => (
                <div key={plant.id} className="flex items-center gap-3 py-1">
                  <span className="text-xl shrink-0">{plant.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2A2622] truncate">
                      {plant.name}
                    </p>
                    <p className="text-xs text-[#A9A29A] mt-0.5">
                      Date de semis non enregistrée —{" "}
                      <Link href="/garden" className="text-[#2D5A3D] hover:underline">
                        Ajouter
                      </Link>
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* À FAIRE MAINTENANT — concrete actions */}
          {actionNow.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#E8912D] p-4 space-y-4">
              <h2
                className="text-base font-bold text-[#E8912D]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                À faire maintenant
              </h2>
              <div className="space-y-4">
                {actionNow.map((plant) => {
                  const progressPercent = plant.overallPercent ?? 0;
                  const segLabel = plant.currentSegment?.label ?? "En cours";
                  const phaseColor = plant.currentSegment?.color;

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
                              color: plant.isOverdue ? "#C4463A" : "#7D766E",
                            }}
                          >
                            {plant.isOverdue
                              ? `En retard de ${Math.abs(plant.currentSegment!.endDay - plant.currentSegment!.startDay - plant.currentSegmentProgress)} j`
                              : `Jour ${plant.currentSegmentProgress + 1} sur ${plant.currentSegmentTotal}`}
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
            </section>
          )}

          {/* À FAIRE BIENTÔT — transition within 7 days */}
          {actionSoon.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#D4A017] p-4 space-y-3">
              <h2
                className="text-base font-bold text-[#D4A017]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                📅 Bientôt
              </h2>
              <ul className="space-y-2">
                {actionSoon.map((plant) => (
                  <li key={plant.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#3D3832]">
                      <span className="font-semibold text-[#2A2622]">{plant.emoji} {plant.name}</span>
                      {plant.quantity > 1 && (
                        <span className="text-[#A9A29A] font-normal"> x{plant.quantity}</span>
                      )}
                    </span>
                    <span className="text-xs text-[#D4A017] whitespace-nowrap">
                      {plant.upcomingTransition!.label} dans {plant.upcomingTransition!.daysUntil} jour{plant.upcomingTransition!.daysUntil !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* EN CROISSANCE — passive monitoring */}
          {growing.length > 0 && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#2D5A3D] p-4 space-y-3">
              <h2
                className="text-base font-bold text-[#2D5A3D]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                En croissance
              </h2>
              <div className="space-y-3">
                {growing.map((plant) => {
                  const segLabel = plant.currentSegment?.label ?? "En cours";
                  const segColor = plant.currentSegment?.color;
                  const segPercent = plant.currentSegmentTotal > 0
                    ? Math.round((plant.currentSegmentProgress / plant.currentSegmentTotal) * 100)
                    : 0;
                  const daysLeft = plant.currentSegmentTotal - plant.currentSegmentProgress;
                  const nextLabel = plant.nextPhaseAction === "repiquage"
                    ? "Repiquage"
                    : plant.nextPhaseAction === "transplant"
                    ? "Mise au potager"
                    : null;

                  return (
                    <div key={plant.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{plant.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2A2622] truncate">
                              {plant.name}
                              {plant.quantity > 1 && (
                                <span className="text-[#A9A29A] font-normal"> x{plant.quantity}</span>
                              )}
                            </p>
                            <p className="text-xs text-[#7D766E]">
                              {segLabel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-[#7D766E]">
                            Jour {plant.currentSegmentProgress + 1} sur {plant.currentSegmentTotal}
                          </p>
                          {nextLabel && daysLeft > 0 && (
                            <p className="text-xs text-[#A9A29A]">
                              {nextLabel} dans {daysLeft}j
                            </p>
                          )}
                        </div>
                      </div>
                      <ProgressBar
                        percent={segPercent}
                        isComplete={false}
                        isOverdue={false}
                        color={segColor}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SEMAINE PROCHAINE */}
          {hasNextWeekTasks && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] border-l-4 border-l-[#D4CFC7] p-4 space-y-3">
              <h2
                className="text-base font-bold text-[#7D766E]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                🔮 Semaine prochaine
              </h2>
              <div className="space-y-3">
                {phaseOrder.map((phase) => {
                  const rows = nextWeekByPhase[phase];
                  if (!rows || rows.length === 0) return null;
                  const { emoji, label } = phaseConfig[phase];
                  return (
                    <div key={phase}>
                      <p className="text-xs font-medium text-[#5C5650] mb-1">
                        {emoji} {label}
                      </p>
                      <ul className="space-y-1 pl-4">
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
            </section>
          )}

          {/* No tasks at all */}
          {!hasAnyContent && (
            <section className="bg-white rounded-xl border border-[#E8E4DE] p-6 text-center">
              <p className="text-sm text-[#7D766E]">
                Rien de prévu cette semaine! 🎉 Profitez du potager.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Espace utilisé */}
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

      {/* Observations passées */}
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
    </div>
  );
}
