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
import { eq, inArray, lt, and, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { CalendarTimeline } from "@/components/dashboard/calendar-timeline";
import { CalendarLegend } from "@/components/dashboard/legend";
import {
  getCurrentWeek,
  getWeekLabel,
  isOffSeason,
  getFrenchDate,
} from "@/lib/calendar-utils";
import { fromMeters, unitSquaredLabel, type UnitPreference } from "@/lib/units";
import { getPlantEmoji, getStatusLabel } from "@/lib/plant-utils";
import {
  getSmartActivePhases,
  getRepiquageStatus,
  getPhasesStartingNextWeek,
  phaseConfig,
  phaseOrder,
  stepTypeLabels,
} from "@/lib/phase-utils";
import type { PlantActionRow } from "@/lib/phase-utils";
import { generateTip, type TipContext } from "@/lib/tip-templates";

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
                . Profitez-en pour planifier votre jardin!
              </p>
              <Link
                href="/garden"
                className="inline-flex h-9 items-center px-6 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Gérer mon jardin
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
                Votre jardin est vide
              </h2>
              <p className="text-sm text-[#7D766E]">
                Ajoutez vos premières plantes pour voir votre calendrier
                personnalisé.
              </p>
              <Link
                href="/garden"
                className="inline-flex h-9 items-center px-6 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
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

  const plantRows: Array<{
    id: number;
    name: string;
    quantity: number;
    plantedDate: string | null;
    daysIndoorToRepiquage: number | null;
    daysRepiquageToTransplant: number | null;
    daysTransplantToHarvest: number | null;
    calendar: typeof plant_calendars.$inferSelect | null;
  }> = userPlantRows.map((row) => ({
    id: row.userPlant.id,
    name: row.plant.name,
    quantity: row.userPlant.quantity,
    plantedDate: row.userPlant.planted_date ?? null,
    daysIndoorToRepiquage: row.plant.days_indoor_to_repiquage ?? null,
    daysRepiquageToTransplant: row.plant.days_repiquage_to_transplant ?? null,
    daysTransplantToHarvest: row.plant.days_transplant_to_harvest ?? null,
    calendar: calendarMap.get(row.plant.id) ?? null,
  }));

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

  const allObservations = plantIds.length > 0
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

  const hasThisWeekTasks = thisWeekByPhase.size > 0;
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

  const displayPlants = userPlantRows.slice(0, 8);
  const hasMorePlants = userPlantRows.length > 8;

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

      {/* Overdue tasks alert */}
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

      {/* Two-column zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Cette semaine */}
        <div className="space-y-4">
          {offSeason ? (
            <div className="bg-white rounded-xl border border-[#E8E4DE] shadow-sm p-8 text-center space-y-3">
              <span className="text-4xl">❄️</span>
              <h2
                className="text-lg font-bold text-[#2A2622]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Hors saison
              </h2>
              <p className="text-sm text-[#7D766E]">
                La prochaine saison commence dans{" "}
                <span className="font-semibold text-[#3D3832]">
                  {weeksUntilSeason} semaine{weeksUntilSeason !== 1 ? "s" : ""}
                </span>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border-l-4 border-l-[#2D5A3D] border-t border-r border-b border-[#E8E4DE] p-4 space-y-4">
                <h2
                  className="text-base font-bold text-[#2D5A3D]"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  📋 Cette semaine
                </h2>

                {!hasThisWeekTasks ? (
                  <p className="text-sm text-[#7D766E]">
                    Rien de prévu cette semaine! 🎉 Profitez du jardin.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {phaseOrder.map((phase) => {
                      const rows = thisWeekByPhase.get(phase);
                      if (!rows || rows.length === 0) return null;
                      const { emoji, label } = phaseConfig[phase];
                      return (
                        <div key={phase}>
                          <p className="text-sm font-semibold text-[#3D3832] mb-2">
                            {emoji} {label}
                          </p>
                          <ul className="space-y-2 pl-5">
                            {rows.map((row) => {
                              const cal = row.calendar;
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
                                germinationTempMin: cal?.germination_temp_min ?? null,
                                germinationTempMax: cal?.germination_temp_max ?? null,
                                depthMm: cal?.depth_mm ?? null,
                                sowingMethod: cal?.sowing_method ?? null,
                                heightCm: cal?.height_cm ?? null,
                                daysToMaturityMin: cal?.days_to_maturity_min ?? null,
                                daysToMaturityMax: cal?.days_to_maturity_max ?? null,
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

              {hasNextWeekTasks && (
                <div className="bg-white rounded-xl border-l-4 border-l-[#D4CFC7] border-t border-r border-b border-[#E8E4DE] p-4 space-y-4">
                  <h2
                    className="text-base font-bold text-[#7D766E]"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    📅 La semaine prochaine
                  </h2>
                  <div className="space-y-4">
                    {phaseOrder.map((phase) => {
                      const rows = nextWeekByPhase.get(phase);
                      if (!rows || rows.length === 0) return null;
                      const { emoji, label } = phaseConfig[phase];
                      return (
                        <div key={phase}>
                          <p className="text-sm font-medium text-[#5C5650] mb-2">
                            {emoji} {label}
                          </p>
                          <ul className="space-y-1 pl-5">
                            {rows.map((row) => (
                              <li
                                key={row.id}
                                className="text-sm text-[#A9A29A]"
                              >
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
              )}
            </>
          )}
        </div>

        {/* Right: Mes plantes */}
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              🌿 Mes plantes
            </h2>
            {hasMorePlants && (
              <Link
                href="/garden"
                className="text-xs text-[#2D5A3D] hover:underline font-medium"
              >
                Voir tout →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {displayPlants.map(({ userPlant, plant }) => {
              const cal = calendarMap.get(plant.id) ?? null;
              const status = getStatusLabel(cal, currentWeek);
              const emoji = getPlantEmoji(plant.name);
              return (
                <Link
                  key={userPlant.id}
                  href={`/garden/${userPlant.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F2EE] transition-colors"
                >
                  <span className="text-xl shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#2A2622] truncate">
                      {plant.name}
                    </p>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5"
                      style={{
                        backgroundColor: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Space usage bar */}
      {spacePercent !== null && (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#3D3832]">
              Espace utilisé
            </span>
            <span className="text-sm text-[#7D766E]">
              {fromMeters(usedAreaM2, unitPref).toFixed(1)} {areaUnitLabel} /{" "}
              {fromMeters(totalAreaM2 ?? 0, unitPref).toFixed(1)} {areaUnitLabel}{" "}
              ({spacePercent}%)
            </span>
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
        </div>
      )}

      {/* Calendar timeline */}
      <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6 space-y-4">
        <CalendarTimeline plants={plantRows} currentWeek={currentWeek} />
        <div className="pt-2 border-t border-[#F5F2EE]">
          <CalendarLegend />
        </div>
      </div>

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
    </div>
  );
}
