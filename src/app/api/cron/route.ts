import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  user_plants,
  plants,
  plant_calendars,
  plant_steps,
  notification_logs,
  observations,
} from "@/lib/db/schema";
import { eq, lt, and, isNotNull, desc } from "drizzle-orm";
import { getCurrentWeek, getWeekLabel } from "@/lib/calendar-utils";
import { callAI, getAIProvider } from "@/lib/ai";
import { getSmartActivePhases, getRepiquageStatus } from "@/lib/phase-utils";
import type { Phase, PlantActionRow } from "@/lib/phase-utils";
import { getEffectiveLifecycleDurations, getPhaseTransitionDays } from "@/lib/lifecycle-calc";

interface PlantWithCalendar {
  name: string;
  userPlantId: number;
  plantedDate: string | null;
  sowingType: "indoor" | "outdoor" | null;
  defaultIndoorToTransplant: number | null;
  daysIndoorToRepiquage: number | null;
  daysRepiquageToTransplant: number | null;
  daysTransplantToHarvest: number | null;
  indoor_sow_start: number | null;
  indoor_sow_end: number | null;
  transplant_start: number | null;
  transplant_end: number | null;
  outdoor_sow_start: number | null;
  outdoor_sow_end: number | null;
  garden_transplant_start: number | null;
  garden_transplant_end: number | null;
  harvest_start: number | null;
  harvest_end: number | null;
  depth_mm: number | null;
  germination_temp_min: number | null;
  germination_temp_max: number | null;
  sowing_method: string | null;
  luminosity: string | null;
  height_cm: number | null;
  days_to_maturity_min: number | null;
  days_to_maturity_max: number | null;
  frost_tolerance: string | null;
  spacing_cm: number | null;
  row_spacing_cm: number | null;
}

function plantWithCalendarToActionRow(plant: PlantWithCalendar): PlantActionRow {
  return {
    id: plant.userPlantId,
    plantId: plant.userPlantId,
    name: plant.name,
    plantedDate: plant.plantedDate,
    daysIndoorToRepiquage: plant.daysIndoorToRepiquage,
    daysRepiquageToTransplant: plant.daysRepiquageToTransplant,
    daysTransplantToHarvest: plant.daysTransplantToHarvest,
    frostTolerance: plant.frost_tolerance,
    spacingCm: plant.spacing_cm,
    rowSpacingCm: plant.row_spacing_cm,
    repiquageAt: null,
    transplantAt: null,
    sowingType: plant.sowingType,
    calendar: {
      indoor_sow_start: plant.indoor_sow_start,
      indoor_sow_end: plant.indoor_sow_end,
      transplant_start: plant.transplant_start,
      transplant_end: plant.transplant_end,
      outdoor_sow_start: plant.outdoor_sow_start,
      outdoor_sow_end: plant.outdoor_sow_end,
      garden_transplant_start: plant.garden_transplant_start,
      garden_transplant_end: plant.garden_transplant_end,
      harvest_start: plant.harvest_start,
      harvest_end: plant.harvest_end,
      depth_mm: plant.depth_mm,
      germination_temp_min: plant.germination_temp_min,
      germination_temp_max: plant.germination_temp_max,
      sowing_method: plant.sowing_method,
      luminosity: plant.luminosity,
      height_cm: plant.height_cm,
      days_to_maturity_min: plant.days_to_maturity_min,
      days_to_maturity_max: plant.days_to_maturity_max,
    },
  };
}

function isStartingThisWeek(
  start: number | null,
  week: number
): boolean {
  return start !== null && start === week;
}

function generateTips(plant: PlantWithCalendar, week: number): string[] {
  const tips: string[] = [];
  const phases = getSmartActivePhases(plantWithCalendarToActionRow(plant), week);

  if (phases.length === 0) return tips;

  // Indoor sowing tips
  if (phases.includes("indoor_sow")) {
    const starting = isStartingThisWeek(plant.indoor_sow_start, week);
    if (starting) {
      tips.push(`🌱 *${plant.name}* — C'est le moment de démarrer vos semis à l'intérieur!`);
    } else {
      tips.push(`🌱 *${plant.name}* — Semis intérieur en cours.`);
    }
    if (plant.depth_mm) {
      tips.push(`   📏 Profondeur de semis: ${plant.depth_mm}mm`);
    }
    if (plant.germination_temp_min && plant.germination_temp_max) {
      tips.push(
        `   🌡️ Température de germination: ${plant.germination_temp_min}-${plant.germination_temp_max}°C`
      );
    }
    if (plant.sowing_method) {
      const methodLabels: Record<string, string> = {
        surface: "Semez en surface, ne pas couvrir",
        poquet: "Semez en poquet (2-3 graines par trou)",
        ligne: "Semez en ligne continue",
        volee: "Semez à la volée",
      };
      const label = methodLabels[plant.sowing_method] ?? plant.sowing_method;
      tips.push(`   🪴 Méthode: ${label}`);
    }
    if (plant.luminosity) {
      const lumLabels: Record<string, string> = {
        soleil: "Plein soleil requis",
        mi_ombre: "Mi-ombre acceptable",
        ombre: "Tolère l'ombre",
      };
      tips.push(`   ☀️ ${lumLabels[plant.luminosity] ?? plant.luminosity}`);
    }
  }

  // Transplant (repiquage) tips
  if (phases.includes("transplant")) {
    if (plant.plantedDate && plant.daysIndoorToRepiquage) {
      const plantedMs = new Date(plant.plantedDate + "T00:00:00").getTime();
      const repiquageMs = plantedMs + plant.daysIndoorToRepiquage * 24 * 60 * 60 * 1000;
      const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
      const daysSincePlanted = Math.floor((todayMs - plantedMs) / (24 * 60 * 60 * 1000));
      const daysUntilRepiquage = Math.floor((repiquageMs - todayMs) / (24 * 60 * 60 * 1000));
      if (daysUntilRepiquage > 0) {
        tips.push(
          `🪴 *${plant.name}* — Semé il y a ${daysSincePlanted} jour${daysSincePlanted !== 1 ? "s" : ""} — repiquage prévu dans ${daysUntilRepiquage} jour${daysUntilRepiquage !== 1 ? "s" : ""}`
        );
      } else {
        const starting = isStartingThisWeek(plant.transplant_start, week);
        if (starting) {
          tips.push(
            `🪴 *${plant.name}* — Temps de repiquer vos semis dans des pots plus grands!`
          );
        } else {
          tips.push(`🪴 *${plant.name}* — Repiquage en cours.`);
        }
      }
    } else {
      const starting = isStartingThisWeek(plant.transplant_start, week);
      if (starting) {
        tips.push(
          `🪴 *${plant.name}* — Temps de repiquer vos semis dans des pots plus grands!`
        );
      } else {
        tips.push(`🪴 *${plant.name}* — Repiquage en cours.`);
      }
    }
    tips.push(
      `   💡 Astuce: Manipulez les semis par les feuilles, jamais par la tige.`
    );
  }

  // Outdoor sowing tips
  if (phases.includes("outdoor_sow")) {
    const starting = isStartingThisWeek(plant.outdoor_sow_start, week);
    if (starting) {
      tips.push(
        `🌿 *${plant.name}* — Semez directement à l'extérieur cette semaine!`
      );
    } else {
      tips.push(`🌿 *${plant.name}* — Semis extérieur en cours.`);
    }
    if (plant.depth_mm) {
      tips.push(`   📏 Profondeur: ${plant.depth_mm}mm`);
    }
    if (plant.spacing_cm) {
      tips.push(`   📐 Espacement entre plants: ${plant.spacing_cm}cm`);
    }
    if (plant.row_spacing_cm) {
      tips.push(`   📐 Espacement entre rangs: ${plant.row_spacing_cm}cm`);
    }
    if (plant.frost_tolerance === "tender") {
      tips.push(
        `   ⚠️ Attention: Sensible au gel! Assurez-vous que les risques de gel tardif sont passés.`
      );
    }
  }

  // Garden transplant tips
  if (phases.includes("garden_transplant")) {
    const starting = isStartingThisWeek(
      plant.garden_transplant_start,
      week
    );
    if (starting) {
      tips.push(
        `🏡 *${plant.name}* — Prêt pour la transplantation au potager!`
      );
    } else {
      tips.push(`🏡 *${plant.name}* — Transplantation au potager en cours.`);
    }
    if (plant.spacing_cm) {
      tips.push(`   📐 Espacement: ${plant.spacing_cm}cm entre plants, ${plant.row_spacing_cm ?? "?"}cm entre rangs`);
    }
    if (plant.frost_tolerance === "tender") {
      tips.push(
        `   ⚠️ Sensible au gel — surveillez les prévisions nocturnes.`
      );
    }
    tips.push(
      `   💡 Astuce: Arrosez bien après la transplantation et protégez du soleil direct les premiers jours.`
    );
  }

  // Harvest tips
  if (phases.includes("harvest")) {
    const starting = isStartingThisWeek(plant.harvest_start, week);
    if (starting) {
      tips.push(`🍅 *${plant.name}* — La récolte commence cette semaine!`);
    } else {
      tips.push(`🍅 *${plant.name}* — Période de récolte.`);
    }
    if (plant.days_to_maturity_min && plant.days_to_maturity_max) {
      tips.push(
        `   ⏱️ Maturité: ${plant.days_to_maturity_min}-${plant.days_to_maturity_max} jours après semis.`
      );
    }
    if (plant.height_cm) {
      tips.push(`   📏 Hauteur attendue: ~${plant.height_cm}cm`);
    }
    tips.push(
      `   💡 Astuce: Récoltez le matin pour une meilleure fraîcheur.`
    );
  }

  return tips;
}

function generatePhaseTransitionTips(plant: PlantWithCalendar): string[] {
  if (!plant.plantedDate || plant.sowingType === null) return [];

  const durations = getEffectiveLifecycleDurations(
    plant.daysIndoorToRepiquage,
    plant.daysRepiquageToTransplant,
    plant.daysTransplantToHarvest,
    plant.sowingType,
    {
      days_to_maturity_min: plant.days_to_maturity_min,
      days_to_maturity_max: plant.days_to_maturity_max,
      indoor_sow_start: plant.indoor_sow_start,
      indoor_sow_end: plant.indoor_sow_end,
      outdoor_sow_start: plant.outdoor_sow_start,
      outdoor_sow_end: plant.outdoor_sow_end,
      transplant_start: plant.transplant_start,
      transplant_end: plant.transplant_end,
      garden_transplant_start: plant.garden_transplant_start,
      garden_transplant_end: plant.garden_transplant_end,
      harvest_start: plant.harvest_start,
      harvest_end: plant.harvest_end,
      depth_mm: plant.depth_mm,
      germination_temp_min: plant.germination_temp_min,
      germination_temp_max: plant.germination_temp_max,
      sowing_method: plant.sowing_method,
      luminosity: plant.luminosity,
      height_cm: plant.height_cm,
    },
    plant.defaultIndoorToTransplant
  );

  const transitions = getPhaseTransitionDays(durations);
  const DAY = 24 * 60 * 60 * 1000;
  const plantedMs = new Date(plant.plantedDate + "T00:00:00").getTime();
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  const daysSincePlanted = Math.floor((todayMs - plantedMs) / DAY);

  const tips: string[] = [];

  if (transitions.acclimationStart !== null && daysSincePlanted === transitions.acclimationStart) {
    tips.push(`🌿 *${plant.name}* — Prêt pour l'acclimatation! Commence à sortir les plants 2h par jour.`);
  }

  if (transitions.transplantReady !== null) {
    if (daysSincePlanted === transitions.transplantReady) {
      tips.push(`🏡 *${plant.name}* — Acclimatation terminée — prêt pour le potager!`);
    } else if (daysSincePlanted > transitions.transplantReady + 3) {
      const retard = daysSincePlanted - transitions.transplantReady;
      tips.push(`⚠️ *${plant.name}* — En retard de ${retard} jour${retard !== 1 ? "s" : ""} pour la transplantation.`);
    }
  }

  return tips;
}

async function fetchWeatherForSlack(
  lat: number,
  lon: number,
  baseUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/weather?lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    let msg = `🌡️ *Météo:* ${data.city} — ${data.current_temp}°C, ${data.description}`;
    if (data.frost_warning) {
      msg += "\n⚠️ *Gel prévu cette nuit — protégez vos semis et plants sensibles!*";
    }
    return msg;
  } catch {
    return null;
  }
}

async function fetchPastObservations(
  userId: string,
  plantIds: number[],
  currentWeek: number
): Promise<string[]> {
  if (plantIds.length === 0) return [];
  const currentYear = new Date().getFullYear();
  const tips: string[] = [];

  for (const plantId of plantIds) {
    const pastObs = await db
      .select({
        content: observations.content,
        year: observations.year,
        week_number: observations.week_number,
        plantName: plants.name,
      })
      .from(observations)
      .innerJoin(plants, eq(observations.plant_id, plants.id))
      .where(
        and(
          eq(observations.user_id, userId),
          eq(observations.plant_id, plantId),
          lt(observations.year, currentYear)
        )
      );

    const relevant = pastObs.filter(
      (o) => Math.abs(o.week_number - currentWeek) <= 2
    );

    for (const obs of relevant) {
      const yearsAgo = currentYear - obs.year;
      const label = yearsAgo === 1 ? "L'an dernier" : `Il y a ${yearsAgo} ans`;
      tips.push(
        `📝 *${obs.plantName}* — ${label}, semaine ${obs.week_number}: "${obs.content}"`
      );
    }
  }

  return tips;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentWeek = getCurrentWeek();
  const weekLabel = getWeekLabel(currentWeek);
  const today = new Date().toISOString().slice(0, 10);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `https://${request.headers.get("host")}`;

  const allUsers = await db.query.users.findMany({
    where: (u, { isNotNull }) => isNotNull(u.slack_webhook),
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const user of allUsers) {
    if (!user.slack_webhook) continue;

    const userPlantRows = await db
      .select({
        userPlantId: user_plants.id,
        plantedDate: user_plants.planted_date,
        sowingType: user_plants.sowing_type,
        plantName: plants.name,
        plantId: plants.id,
        spacingCm: plants.spacing_cm,
        rowSpacingCm: plants.row_spacing_cm,
        frostTolerance: plants.frost_tolerance,
        daysIndoorToRepiquage: plants.days_indoor_to_repiquage,
        daysRepiquageToTransplant: plants.days_repiquage_to_transplant,
        daysTransplantToHarvest: plants.days_transplant_to_harvest,
        defaultIndoorToTransplant: plants.default_indoor_to_transplant,
      })
      .from(user_plants)
      .innerJoin(plants, eq(user_plants.plant_id, plants.id))
      .where(eq(user_plants.user_id, user.id));

    if (userPlantRows.length === 0) continue;

    processed++;

    const zone = user.climate_zone ?? "zone_5_6";

    const plantsWithCalendar: PlantWithCalendar[] = [];
    for (const row of userPlantRows) {
      const cal = await db.query.plant_calendars.findFirst({
        where: (pc, { eq, and }) =>
          and(eq(pc.plant_id, row.plantId), eq(pc.zone, zone)),
      });
      plantsWithCalendar.push({
        name: row.plantName,
        userPlantId: row.userPlantId,
        plantedDate: row.plantedDate ?? null,
        sowingType: row.sowingType ?? null,
        defaultIndoorToTransplant: row.defaultIndoorToTransplant ?? null,
        daysIndoorToRepiquage: row.daysIndoorToRepiquage ?? null,
        daysRepiquageToTransplant: row.daysRepiquageToTransplant ?? null,
        daysTransplantToHarvest: row.daysTransplantToHarvest ?? null,
        indoor_sow_start: cal?.indoor_sow_start ?? null,
        indoor_sow_end: cal?.indoor_sow_end ?? null,
        transplant_start: cal?.transplant_start ?? null,
        transplant_end: cal?.transplant_end ?? null,
        outdoor_sow_start: cal?.outdoor_sow_start ?? null,
        outdoor_sow_end: cal?.outdoor_sow_end ?? null,
        garden_transplant_start: cal?.garden_transplant_start ?? null,
        garden_transplant_end: cal?.garden_transplant_end ?? null,
        harvest_start: cal?.harvest_start ?? null,
        harvest_end: cal?.harvest_end ?? null,
        depth_mm: cal?.depth_mm ?? null,
        germination_temp_min: cal?.germination_temp_min ?? null,
        germination_temp_max: cal?.germination_temp_max ?? null,
        sowing_method: cal?.sowing_method ?? null,
        luminosity: cal?.luminosity ?? null,
        height_cm: cal?.height_cm ?? null,
        days_to_maturity_min: cal?.days_to_maturity_min ?? null,
        days_to_maturity_max: cal?.days_to_maturity_max ?? null,
        frost_tolerance: row.frostTolerance,
        spacing_cm: row.spacingCm,
        row_spacing_cm: row.rowSpacingCm,
      });
    }

    // Build tips per plant
    const allTips: string[] = [];
    for (const plant of plantsWithCalendar) {
      const tips = generateTips(plant, currentWeek);
      allTips.push(...tips);
      const transitionTips = generatePhaseTransitionTips(plant);
      allTips.push(...transitionTips);
    }

    // Overdue steps
    const overdueSteps = await db
      .select({
        stepType: plant_steps.step_type,
        nextActionDate: plant_steps.next_action_date,
        plantName: plants.name,
      })
      .from(plant_steps)
      .innerJoin(user_plants, eq(plant_steps.user_plant_id, user_plants.id))
      .innerJoin(plants, eq(user_plants.plant_id, plants.id))
      .where(
        and(
          eq(user_plants.user_id, user.id),
          isNotNull(plant_steps.next_action_date),
          lt(plant_steps.next_action_date, today)
        )
      );

    // Past observations (year-over-year)
    const plantIds = userPlantRows.map((r) => r.plantId);
    const pastTips = await fetchPastObservations(
      user.id,
      plantIds,
      currentWeek
    );

    // Build message sections
    const sections: string[] = [];

    if (allTips.length > 0) {
      sections.push(`📋 *Conseils de la semaine:*\n${allTips.join("\n")}`);
    }

    if (overdueSteps.length > 0) {
      const stepTypeLabels: Record<string, string> = {
        semis_interieur: "Semis intérieur",
        semis_exterieur: "Semis extérieur",
        repiquage: "Repiquage",
        transplantation: "Transplantation",
        entretien: "Entretien",
        arrosage: "Arrosage",
        fertilisation: "Fertilisation",
        recolte: "Récolte",
      };
      const lines = overdueSteps
        .map(
          (s) =>
            `• ${s.plantName} — ${stepTypeLabels[s.stepType] ?? s.stepType} (prévu le ${s.nextActionDate})`
        )
        .join("\n");
      sections.push(`⚠️ *Actions en retard:*\n${lines}`);
    }

    if (pastTips.length > 0) {
      sections.push(
        `📓 *Notes des saisons passées:*\n${pastTips.join("\n")}`
      );
    }

    if (user.location_lat && user.location_lon) {
      const weatherMsg = await fetchWeatherForSlack(
        user.location_lat,
        user.location_lon,
        baseUrl
      );
      if (weatherMsg) {
        sections.push(weatherMsg);
      }
    }

    if (getAIProvider()) {
      try {
        const plantSummary = plantsWithCalendar
          .map((p) => {
            const phases = getSmartActivePhases(plantWithCalendarToActionRow(p), currentWeek);
            return `${p.name} (${phases.length > 0 ? phases.join(", ") : "hors saison"})`;
          })
          .join(", ");

        const recentObs = await db
          .select({
            content: observations.content,
            plantName: plants.name,
          })
          .from(observations)
          .leftJoin(plants, eq(observations.plant_id, plants.id))
          .where(eq(observations.user_id, user.id))
          .orderBy(desc(observations.created_at))
          .limit(3);

        const obsContext =
          recentObs.length > 0
            ? recentObs.map((o) => `"${o.plantName ?? "Potager"}: ${o.content}"`).join(", ")
            : "aucune";

        const weatherContext =
          user.location_lat && user.location_lon
            ? await fetchWeatherForSlack(
                user.location_lat,
                user.location_lon,
                baseUrl
              )
            : null;

        const insightContext = `Zone: ${user.climate_zone ?? "zone_5_6"}, Ville: ${user.location_city ?? "inconnue"}, Sol: ${user.soil_type ?? "inconnu"}, Semaine: ${weekLabel}, Plantes: ${plantSummary}, Météo: ${weatherContext ?? "inconnue"}, Observations récentes: ${obsContext}`;

        const insightResult = await callAI({
          systemPrompt:
            "Tu es un assistant de jardinage expert pour le Québec. Tu réponds en français.",
          userMessage: `Contexte potager: ${insightContext}\n\nEn 2-3 phrases, donne un conseil de jardinage personnalisé et proactif basé sur ce contexte. Sois spécifique aux plantes du jardinier et à la période de l'année.`,
          maxTokens: 4000,
        });

        if (insightResult.text) {
          sections.push(`🤖 *Conseil:*\n${insightResult.text}`);
        }
      } catch {
        // AI insight failure is non-fatal; skip silently
      }
    }

    if (sections.length === 0) continue;

    const messageText = `🌿 *PlantesPlanner — ${weekLabel}*\n\n${sections.join("\n\n")}`;
    const messagePreview = messageText.slice(0, 200);

    try {
      const slackRes = await fetch(user.slack_webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
        signal: AbortSignal.timeout(5000),
      });

      if (!slackRes.ok) {
        throw new Error(`Slack responded with ${slackRes.status}`);
      }

      await db.insert(notification_logs).values({
        user_id: user.id,
        sent_at: new Date(),
        status: "success",
        message_preview: messagePreview,
      });

      sent++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await db.insert(notification_logs).values({
        user_id: user.id,
        sent_at: new Date(),
        status: "failed",
        error_message: errorMessage,
        message_preview: messagePreview,
      });

      failed++;
    }
  }

  return NextResponse.json({
    users_processed: processed,
    messages_sent: sent,
    failures: failed,
  });
}
