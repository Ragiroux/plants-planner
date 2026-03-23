import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user_plants, plants, plant_steps, observations, gardens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { callAI, getAIProvider } from "@/lib/ai";

export async function GET(request: NextRequest) {
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

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const userGardens = await db.query.gardens.findMany({
    where: (g, { eq }) => eq(g.user_id, session.user.id),
  });

  const garden = userGardens[0] ?? null;

  const userPlantRows = await db
    .select({
      userPlant: user_plants,
      plant: plants,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  const userPlantIds = userPlantRows.map((r) => r.userPlant.id);

  let stepsForYear: Array<typeof plant_steps.$inferSelect> = [];
  if (userPlantIds.length > 0) {
    const allSteps = await db
      .select()
      .from(plant_steps)
      .innerJoin(user_plants, eq(plant_steps.user_plant_id, user_plants.id))
      .where(eq(user_plants.user_id, session.user.id));

    stepsForYear = allSteps
      .filter((row) => new Date(row.plant_steps.completed_at).getFullYear() === year)
      .map((row) => row.plant_steps);
  }

  const observationsForYear = await db
    .select()
    .from(observations)
    .where(
      and(
        eq(observations.user_id, session.user.id),
        eq(observations.year, year)
      )
    );

  if (userPlantRows.length === 0 && observationsForYear.length === 0 && stepsForYear.length === 0) {
    return NextResponse.json({
      report: null,
      generatedAt: new Date().toISOString(),
      year,
    });
  }

  const plantsSummary = userPlantRows
    .map((r) => `${r.plant.name} (quantité: ${r.userPlant.quantity})`)
    .join(", ");

  const stepsSummary =
    stepsForYear.length > 0
      ? stepsForYear
          .map((s) => `${s.step_type} le ${s.completed_at.toISOString().slice(0, 10)}${s.notes ? ` — ${s.notes}` : ""}`)
          .join("; ")
      : "Aucune étape enregistrée";

  const obsSummary =
    observationsForYear.length > 0
      ? observationsForYear
          .map((o) => `Semaine ${o.week_number}: ${o.content}`)
          .join("; ")
      : "Aucune observation";

  const gardenInfo = garden
    ? `Potager: ${garden.name}, dimensions: ${garden.length_m ?? "?"}m × ${garden.width_m ?? "?"}m`
    : "Aucun potager configuré";

  const dataContext = `
Année: ${year}
${gardenInfo}
Plantes cultivées: ${plantsSummary}
Étapes réalisées: ${stepsSummary}
Observations: ${obsSummary}
  `.trim();

  const aiResult = await callAI({
    systemPrompt:
      "Tu es un expert en jardinage québécois. Génère un bilan de saison COMPLET en français. Utilise des titres ## markdown. Sections: 1) Résumé (3-4 phrases), 2) Par plante (2-3 phrases chacune), 3) Recommandations (liste courte). IMPORTANT: Le rapport doit être TERMINÉ et COMPLET — ne le coupe JAMAIS au milieu d'une phrase. Limite-toi à 500 mots maximum pour que le rapport soit complet.",
    userMessage: dataContext,
    maxTokens: 4000,
  });

  const report = aiResult.text;

  return NextResponse.json({
    report,
    generatedAt: new Date().toISOString(),
    year,
  });
}
