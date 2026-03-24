import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  user_plants,
  plants,
  plant_calendars,
  gardens,
  plant_steps,
  observations,
} from "@/lib/db/schema";
import { eq, inArray, lt, and, isNotNull, max } from "drizzle-orm";
import Link from "next/link";
import {
  getCurrentWeek,
  getWeekLabel,
  isOffSeason,
  getFrenchDate,
} from "@/lib/calendar-utils";
import { fromMeters, unitSquaredLabel, type UnitPreference } from "@/lib/units";
import { getPlantEmoji } from "@/lib/plant-utils";
import {
  getPhaseReadiness,
  getRepiquageStatus,
  stepTypeLabels,
  phaseConfig,
  phaseOrder,
  getSmartActivePhases,
  getPhasesStartingNextWeek,
} from "@/lib/phase-utils";
import type { PlantActionRow } from "@/lib/phase-utils";
import { generateTip, type TipContext } from "@/lib/tip-templates";
import { getEffectiveLifecycleDurations } from "@/lib/lifecycle-calc";
import { generateSmartTips, type SmartTip, type SmartTipContext } from "@/lib/smart-tips";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.climate_zone) {
    redirect("/onboarding");
  }

  const zone = session.user.climate_zone;
  const currentWeek = getCurrentWeek();
  const weekLabel = getWeekLabel(currentWeek);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentYear = today.getFullYear();
  const frenchDate = getFrenchDate(today);
  const offSeason = isOffSeason(currentWeek);

  const userProfile = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: { unit_preference: true },
  });

  const unitPref = (userProfile?.unit_preference ?? "meters") as UnitPreference;
  const areaUnitLabel = unitSquaredLabel(unitPref);

  const userGardens = await db.query.gardens.findMany({
    where: (g, { eq }) => eq(g.user_id, session.user.id),
  });

  const primaryGarden = userGardens[0] ?? null;

  const userPlantRows = await db
    .select({
      userPlant: user_plants,
      plant: plants,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  const weeksUntilSeason = offSeason ? Math.max(0, 1 - currentWeek + 44) : 0;

  if (userPlantRows.length === 0) {
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
        {offSeason ? (
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
        ) : (
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
      </div>
    );
  }

  const plantIds = userPlantRows.map((r) => r.plant.id);

  const calendars = await db
    .select()
    .from(plant_calendars)
    .where(
      and(
        inArray(plant_calendars.plant_id, plantIds),
        eq(plant_calendars.zone, zone)
      )
    );
  const calendarMap = new Map(calendars.map((c) => [c.plant_id, c]));

  const actionRows: PlantActionRow[] = userPlantRows.map((row) => {
    const cal = calendarMap.get(row.plant.id) ?? null;
    return {
      id: row.userPlant.id,
      plantId: row.plant.id,
      name: row.plant.name,
      plantedDate: row.userPlant.planted_date ?? null,
      daysIndoorToRepiquage: row.plant.days_indoor_to_repiquage ?? null,
      daysRepiquageToTransplant: row.plant.days_repiquage_to_transplant ?? null,
      daysTransplantToHarvest: row.plant.days_transplant_to_harvest ?? null,
      frostTolerance: row.plant.frost_tolerance ?? null,
      spacingCm: row.plant.spacing_cm ?? null,
      rowSpacingCm: row.plant.row_spacing_cm ?? null,
      calendar: cal,
      repiquageAt: row.userPlant.repiquage_at ?? null,
      transplantAt: row.userPlant.transplant_at ?? null,
      sowingType: row.userPlant.sowing_type ?? null,
      defaultIndoorToTransplant: row.plant.default_indoor_to_transplant ?? null,
    };
  });

  const overdueSteps = await db
    .select({
      id: plant_steps.id,
      stepType: plant_steps.step_type,
      nextActionDate: plant_steps.next_action_date,
      plantName: plants.name,
      userPlantId: user_plants.id,
    })
    .from(plant_steps)
    .innerJoin(user_plants, eq(plant_steps.user_plant_id, user_plants.id))
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(
      and(
        eq(user_plants.user_id, session.user.id),
        isNotNull(plant_steps.next_action_date),
        lt(plant_steps.next_action_date, todayStr)
      )
    );

  const allObservations =
    plantIds.length > 0
      ? await db
          .select({
            content: observations.content,
            year: observations.year,
            week_number: observations.week_number,
            plantId: observations.plant_id,
            plantName: plants.name,
          })
          .from(observations)
          .innerJoin(plants, eq(observations.plant_id, plants.id))
          .where(
            and(
              eq(observations.user_id, session.user.id),
              inArray(observations.plant_id, plantIds),
              lt(observations.year, currentYear)
            )
          )
      : [];

  const pastObservations = allObservations.filter(
    (o) => Math.abs(o.week_number - currentWeek) <= 2
  );

  // Smart tips: last watering and fertilization per user_plant
  const userPlantIds = userPlantRows.map((r) => r.userPlant.id);

  const lastWateringRows =
    userPlantIds.length > 0
      ? await db
          .select({
            userPlantId: plant_steps.user_plant_id,
            lastWatering: max(plant_steps.completed_at),
          })
          .from(plant_steps)
          .where(
            and(
              eq(plant_steps.step_type, "arrosage"),
              inArray(plant_steps.user_plant_id, userPlantIds)
            )
          )
          .groupBy(plant_steps.user_plant_id)
      : [];

  const lastFertilizationRows =
    userPlantIds.length > 0
      ? await db
          .select({
            userPlantId: plant_steps.user_plant_id,
            lastFertilization: max(plant_steps.completed_at),
          })
          .from(plant_steps)
          .where(
            and(
              eq(plant_steps.step_type, "fertilisation"),
              inArray(plant_steps.user_plant_id, userPlantIds)
            )
          )
          .groupBy(plant_steps.user_plant_id)
      : [];

  const lastWateringMap = new Map(
    lastWateringRows.map((r) => [r.userPlantId, r.lastWatering])
  );
  const lastFertilizationMap = new Map(
    lastFertilizationRows.map((r) => [r.userPlantId, r.lastFertilization])
  );

  // Fetch weather if user has location
  const userWithLocation = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: { location_lat: true, location_lon: true },
  });

  let weatherForTips: SmartTipContext["weather"] = null;
  if (userWithLocation?.location_lat && userWithLocation?.location_lon) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ??
        (process.env.NEXTAUTH_URL ?? "http://localhost:3000");
      const weatherRes = await fetch(
        `${baseUrl}/api/weather?lat=${userWithLocation.location_lat}&lon=${userWithLocation.location_lon}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        if (!weatherData.error) {
          weatherForTips = {
            forecast: weatherData.forecast.map(
              (d: { day: string; min: number; max: number }) => ({
                day: d.day,
                min: d.min,
                max: d.max,
              })
            ),
            frostWarning: weatherData.frost_warning,
          };
        }
      }
    } catch {
      // Weather fetch failure is non-fatal; proceed without it
    }
  }

  const smartTipPlants: SmartTipContext["plants"] = userPlantRows.map((row) => ({
    name: row.plant.name,
    emoji: getPlantEmoji(row.plant.name),
    frostTolerance: row.plant.frost_tolerance ?? null,
    wateringFreq: row.plant.watering_freq ?? null,
    isInGarden: row.userPlant.transplant_at !== null,
    lastWatering: lastWateringMap.get(row.userPlant.id) ?? null,
    lastFertilization: lastFertilizationMap.get(row.userPlant.id) ?? null,
  }));

  const smartTips: SmartTip[] = generateSmartTips({
    plants: smartTipPlants,
    weather: weatherForTips,
    today,
  });

  const nextWeek = currentWeek + 1;
  const thisWeekByPhase = new Map<string, PlantActionRow[]>();
  const nextWeekByPhase = new Map<string, PlantActionRow[]>();

  for (const row of actionRows) {
    const activePhases = getSmartActivePhases(row, currentWeek);
    for (const phase of activePhases) {
      if (!thisWeekByPhase.has(phase)) thisWeekByPhase.set(phase, []);
      thisWeekByPhase.get(phase)!.push(row);
    }

    const nextPhases = getPhasesStartingNextWeek(row, nextWeek);
    for (const phase of nextPhases) {
      if (!nextWeekByPhase.has(phase)) nextWeekByPhase.set(phase, []);
      nextWeekByPhase.get(phase)!.push(row);
    }
  }

  const hasNextWeekTasks = nextWeekByPhase.size > 0;

  const totalAreaM2 =
    primaryGarden?.length_m && primaryGarden?.width_m
      ? primaryGarden.length_m * primaryGarden.width_m
      : null;

  const usedAreaM2 = userPlantRows.reduce((sum, { plant, userPlant }) => {
    if (plant.spacing_cm && plant.row_spacing_cm) {
      return (
        sum +
        ((plant.spacing_cm * plant.row_spacing_cm) / 10000) * userPlant.quantity
      );
    }
    return sum;
  }, 0);

  const spacePercent =
    totalAreaM2 && totalAreaM2 > 0
      ? Math.min(100, Math.round((usedAreaM2 / totalAreaM2) * 100))
      : null;

  const trackingPlants = actionRows.map((row) => {
    const plantedDate = row.plantedDate;
    const cal = row.calendar;
    const userPlantRow = userPlantRows.find((r) => r.userPlant.id === row.id);
    const quantity = userPlantRow?.userPlant.quantity ?? 1;

    if (plantedDate) {
      const DAY = 24 * 60 * 60 * 1000;
      const todayMs = new Date(todayStr + "T00:00:00").getTime();
      const plantedMs = new Date(plantedDate + "T00:00:00").getTime();
      const daysSincePlanted = Math.floor((todayMs - plantedMs) / DAY);

      const sowingType = row.sowingType ?? null;
      const rowExt = row as PlantActionRow & { defaultIndoorToTransplant?: number | null };
      const defaultIndoorToTransplant = rowExt.defaultIndoorToTransplant ?? null;

      const durations = getEffectiveLifecycleDurations(
        row.daysIndoorToRepiquage,
        row.daysRepiquageToTransplant,
        row.daysTransplantToHarvest,
        sowingType,
        cal,
        defaultIndoorToTransplant,
        plantedDate
      );

      const { d1, d1Accl, d2, d3 } = durations;

      type PhaseSegment = {
        label: string;
        color: string;
        startDay: number;
        endDay: number;
      };

      const toDay = (ms: number) => Math.floor((ms - plantedMs) / DAY);

      const segments: PhaseSegment[] = [];
      let cursorMs = plantedMs;

      if (d1 !== null) {
        const indoorEndMs = row.repiquageAt
          ? new Date(row.repiquageAt + "T00:00:00").getTime()
          : cursorMs + d1 * DAY;
        segments.push({
          label: "Semis intérieur",
          color: "#E8912D",
          startDay: toDay(cursorMs),
          endDay: toDay(indoorEndMs),
        });
        cursorMs = indoorEndMs;

        if (d1Accl !== null) {
          const acclEndMs = cursorMs + d1Accl * DAY;
          segments.push({
            label: "Acclimatation",
            color: "#3B8EA5",
            startDay: toDay(cursorMs),
            endDay: toDay(acclEndMs),
          });
          cursorMs = acclEndMs;
        }
      }
      if (d2 !== null) {
        const endMs = row.transplantAt
          ? new Date(row.transplantAt + "T00:00:00").getTime()
          : cursorMs + d2 * DAY;
        segments.push({
          label: "Repiquage",
          color: "#D45FA0",
          startDay: toDay(cursorMs),
          endDay: toDay(endMs),
        });
        cursorMs = endMs;
      }
      if (d3 !== null) {
        segments.push({
          label: "Au potager",
          color: "#4A9E4A",
          startDay: toDay(cursorMs),
          endDay: toDay(cursorMs + d3 * DAY),
        });
        cursorMs = cursorMs + d3 * DAY;
      }

      const totalDays = toDay(cursorMs) || null;

      let currentSegment: PhaseSegment | null = null;
      let currentSegmentProgress = 0;
      let currentSegmentTotal = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const isLast = i === segments.length - 1;
        if (
          daysSincePlanted >= seg.startDay &&
          (isLast ? daysSincePlanted <= seg.endDay : daysSincePlanted < seg.endDay)
        ) {
          currentSegment = seg;
          currentSegmentProgress = daysSincePlanted - seg.startDay;
          currentSegmentTotal = seg.endDay - seg.startDay;
          break;
        }
      }

      const overallPercent = totalDays
        ? Math.min(100, Math.round((daysSincePlanted / totalDays) * 100))
        : null;

      const isComplete =
        totalDays !== null && daysSincePlanted >= totalDays;
      const isOverdue =
        currentSegment !== null && daysSincePlanted > currentSegment.endDay;

      // Determine next phase action
      let nextPhaseAction: "repiquage" | "transplant" | null = null;
      if (!isComplete && currentSegment) {
        if (currentSegment.label === "Semis intérieur" && !row.repiquageAt) {
          if (sowingType === "indoor" && d2 === null) {
            // indoor direct-sow: no repiquage, advance straight to transplant after acclimatation
            nextPhaseAction = null;
          } else {
            nextPhaseAction = "repiquage";
          }
        } else if (currentSegment.label === "Acclimatation") {
          nextPhaseAction = "transplant";
        } else if (currentSegment.label === "Repiquage" && !row.transplantAt) {
          nextPhaseAction = "transplant";
        }
      }

      const gardenActions =
        !isComplete && currentSegment?.label === "Au potager"
          ? (["arrosage", "fertilisation", "entretien"] as const)
          : null;

      let upcomingTransition: { label: string; daysUntil: number } | null = null;
      if (nextPhaseAction && currentSegment) {
        const daysRemaining = currentSegmentTotal - currentSegmentProgress;
        if (daysRemaining <= 7 && daysRemaining >= 0) {
          const actionLabel =
            nextPhaseAction === "repiquage" ? "Repiquage" : "Mise au potager";
          upcomingTransition = { label: actionLabel, daysUntil: daysRemaining };
        }
      }

      return {
        id: row.id,
        plantId: row.plantId,
        name: row.name,
        emoji: getPlantEmoji(row.name),
        plantedDate,
        hasBiologyData: true as const,
        daysSincePlanted,
        currentSegment,
        currentSegmentProgress,
        currentSegmentTotal,
        overallPercent,
        isComplete,
        isOverdue,
        segments,
        calendar: cal,
        spacingCm: row.spacingCm,
        rowSpacingCm: row.rowSpacingCm,
        frostTolerance: row.frostTolerance,
        daysIndoorToRepiquage: row.daysIndoorToRepiquage,
        daysRepiquageToTransplant: row.daysRepiquageToTransplant,
        daysTransplantToHarvest: row.daysTransplantToHarvest,
        quantity,
        nextPhaseAction,
        gardenActions,
        sowingType,
        upcomingTransition,
      };
    }

    return {
      id: row.id,
      plantId: row.plantId,
      name: row.name,
      emoji: getPlantEmoji(row.name),
      plantedDate: null,
      hasBiologyData: false as const,
      daysSincePlanted: 0,
      currentSegment: null,
      currentSegmentProgress: 0,
      currentSegmentTotal: 0,
      overallPercent: null,
      isComplete: false,
      isOverdue: false,
      segments: [],
      calendar: cal,
      spacingCm: row.spacingCm,
      rowSpacingCm: row.rowSpacingCm,
      frostTolerance: row.frostTolerance,
      daysIndoorToRepiquage: row.daysIndoorToRepiquage,
      daysRepiquageToTransplant: row.daysRepiquageToTransplant,
      daysTransplantToHarvest: row.daysTransplantToHarvest,
      quantity,
      nextPhaseAction: null,
      gardenActions: null,
      sowingType: row.sowingType ?? null,
      upcomingTransition: null,
    };
  });

  const thisWeekByPhaseSerialized: Record<string, Array<{
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
  }>> = {};
  for (const [phase, rows] of thisWeekByPhase.entries()) {
    const seen = new Set<number>();
    thisWeekByPhaseSerialized[phase] = rows
      .filter((row) => {
        if (seen.has(row.plantId)) return false;
        seen.add(row.plantId);
        return true;
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        plantedDate: row.plantedDate,
        daysIndoorToRepiquage: row.daysIndoorToRepiquage,
        frostTolerance: row.frostTolerance,
        spacingCm: row.spacingCm,
        rowSpacingCm: row.rowSpacingCm,
        calData: {
          germinationTempMin: row.calendar?.germination_temp_min ?? null,
          germinationTempMax: row.calendar?.germination_temp_max ?? null,
          depthMm: row.calendar?.depth_mm ?? null,
          sowingMethod: row.calendar?.sowing_method ?? null,
          heightCm: row.calendar?.height_cm ?? null,
          daysToMaturityMin: row.calendar?.days_to_maturity_min ?? null,
          daysToMaturityMax: row.calendar?.days_to_maturity_max ?? null,
        },
      }));
  }

  const nextWeekByPhaseSerialized: Record<string, Array<{ id: number; name: string }>> = {};
  for (const [phase, rows] of nextWeekByPhase.entries()) {
    const seen = new Set<number>();
    nextWeekByPhaseSerialized[phase] = rows
      .filter((row) => {
        if (seen.has(row.plantId)) return false;
        seen.add(row.plantId);
        return true;
      })
      .map((row) => ({ id: row.id, name: row.name }));
  }

  return (
    <DashboardClient
      frenchDate={frenchDate}
      weekLabel={weekLabel}
      zone={zone}
      offSeason={offSeason}
      weeksUntilSeason={weeksUntilSeason}
      overdueSteps={overdueSteps}
      trackingPlants={trackingPlants}
      spacePercent={spacePercent}
      usedAreaM2={usedAreaM2}
      totalAreaM2={totalAreaM2}
      unitPref={unitPref}
      areaUnitLabel={areaUnitLabel}
      primaryGardenId={primaryGarden?.id ?? null}
      currentWeek={currentWeek}
      hasNextWeekTasks={hasNextWeekTasks}
      thisWeekByPhase={thisWeekByPhaseSerialized}
      nextWeekByPhase={nextWeekByPhaseSerialized}
      pastObservations={pastObservations}
      currentYear={currentYear}
      smartTips={smartTips}
    />
  );
}
