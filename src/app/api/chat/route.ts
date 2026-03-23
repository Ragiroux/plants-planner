import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chat_messages,
  users,
  user_plants,
  plants,
  plant_steps,
  observations,
} from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { getCurrentWeek, getWeekLabel } from "@/lib/calendar-utils";
import { callAI, getAIProvider } from "@/lib/ai";

function getActivePhaseLabel(
  plant: {
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
  },
  week: number
): string {
  const check = (
    start: number | null,
    end: number | null,
    label: string
  ): string | null => {
    if (start !== null && end !== null && week >= start && week <= end)
      return label;
    return null;
  };
  const phases = [
    check(plant.indoor_sow_start, plant.indoor_sow_end, "semis intérieur"),
    check(plant.transplant_start, plant.transplant_end, "repiquage"),
    check(plant.outdoor_sow_start, plant.outdoor_sow_end, "semis extérieur"),
    check(
      plant.garden_transplant_start,
      plant.garden_transplant_end,
      "transplantation"
    ),
    check(plant.harvest_start, plant.harvest_end, "récolte"),
  ].filter(Boolean);
  return phases.length > 0 ? phases.join(", ") : "hors saison";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!getAIProvider()) {
    return NextResponse.json(
      { error: "Agent IA non configuré" },
      { status: 503 }
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const userId = session.user.id;

  // Rate limit: max 20 messages per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayMessages = await db
    .select({ id: chat_messages.id })
    .from(chat_messages)
    .where(
      and(
        eq(chat_messages.user_id, userId),
        gte(chat_messages.created_at, todayStart)
      )
    );

  if (todayMessages.length >= 20) {
    return NextResponse.json(
      { error: "Limite de 20 messages par jour atteinte" },
      { status: 429 }
    );
  }

  // Fetch user profile
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: {
      climate_zone: true,
      location_city: true,
      soil_type: true,
      location_lat: true,
      location_lon: true,
    },
  });

  const zone = user?.climate_zone ?? "zone_5_6";
  const zoneLabel = zone === "zone_3_4" ? "Zone 3-4" : "Zone 5-6";
  const city = user?.location_city ?? "non spécifiée";
  const soil = user?.soil_type ?? "non spécifié";

  const currentWeek = getCurrentWeek();
  const weekLabel = getWeekLabel(currentWeek);

  // Fetch user plants with calendar data
  const userPlantRows = await db
    .select({
      plantName: plants.name,
      plantId: plants.id,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, userId));

  const plantList: string[] = [];
  for (const row of userPlantRows) {
    const cal = await db.query.plant_calendars.findFirst({
      where: (pc, { eq: eqFn, and: andFn }) =>
        andFn(eq(pc.plant_id, row.plantId), eq(pc.zone, zone)),
    });
    const phaseLabel = cal
      ? getActivePhaseLabel(cal, currentWeek)
      : "hors saison";
    plantList.push(`${row.plantName} (${phaseLabel})`);
  }

  // Fetch weather
  let weatherText = "";
  if (user?.location_lat && user?.location_lon) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${baseUrl}/api/weather?lat=${user.location_lat}&lon=${user.location_lon}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          weatherText = `${data.city}: ${data.current_temp}°C, ${data.description}`;
          if (data.frost_warning) weatherText += " — ⚠️ Gel prévu cette nuit";
        }
      }
    } catch {
      // weather fetch failure is non-fatal
    }
  }

  // Fetch recent observations (last 5)
  const recentObs = await db
    .select({
      content: observations.content,
      plantName: plants.name,
      created_at: observations.created_at,
    })
    .from(observations)
    .leftJoin(plants, eq(observations.plant_id, plants.id))
    .where(eq(observations.user_id, userId))
    .orderBy(desc(observations.created_at))
    .limit(5);

  const obsText =
    recentObs.length > 0
      ? recentObs
          .map(
            (o) =>
              `- ${o.plantName ?? "Potager"}: "${o.content}"`
          )
          .join("\n")
      : "Aucune observation récente.";

  // Fetch recent steps (last 5)
  const recentSteps = await db
    .select({
      stepType: plant_steps.step_type,
      plantName: plants.name,
      completed_at: plant_steps.completed_at,
      notes: plant_steps.notes,
    })
    .from(plant_steps)
    .innerJoin(user_plants, eq(plant_steps.user_plant_id, user_plants.id))
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, userId))
    .orderBy(desc(plant_steps.completed_at))
    .limit(5);

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

  const stepsText =
    recentSteps.length > 0
      ? recentSteps
          .map(
            (s) =>
              `- ${s.plantName}: ${stepTypeLabels[s.stepType] ?? s.stepType}${s.notes ? ` ("${s.notes}")` : ""}`
          )
          .join("\n")
      : "Aucune étape récente.";

  const systemPrompt = `Tu es un assistant de jardinage expert pour le Québec. Tu réponds en français.

Contexte du jardinier:
- Zone climatique: ${zoneLabel}
- Localisation: ${city}
- Type de sol: ${soil}
- Semaine actuelle: ${weekLabel}
- Plantes dans le potager: ${plantList.length > 0 ? plantList.join(", ") : "Aucune plante ajoutée"}

Météo actuelle: ${weatherText || "Non disponible"}

Observations récentes:
${obsText}

Étapes récentes:
${stepsText}

IMPORTANT: Réponds en 3-5 phrases MAXIMUM. Sois direct et pratique. Pas de listes à puces longues. Pas d'introduction générale. Va droit au point avec des conseils spécifiques pour CE jardinier.`;

  // Save user message
  await db.insert(chat_messages).values({
    user_id: userId,
    role: "user",
    content: userMessage,
  });

  let assistantResponse: string;
  try {
    const aiResult = await callAI({
      systemPrompt,
      userMessage,
      maxTokens: 500,
    });
    assistantResponse = aiResult.text;
  } catch {
    return NextResponse.json(
      { error: "Service temporairement indisponible" },
      { status: 503 }
    );
  }

  // Save assistant response
  await db.insert(chat_messages).values({
    user_id: userId,
    role: "assistant",
    content: assistantResponse,
  });

  return NextResponse.json({ response: assistantResponse });
}
