"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user_plants, plants, plant_steps, observations, varieties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNextActionDate, stepObservationContent, type StepType } from "@/lib/step-utils";
import { getCurrentWeek } from "@/lib/calendar-utils";

export async function logStep(
  userPlantId: number,
  stepType: StepType,
  notes?: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const userPlant = await db.query.user_plants.findFirst({
    where: (up, { eq }) => eq(up.id, userPlantId),
  });

  if (!userPlant || userPlant.user_id !== session.user.id) {
    return { error: "Plante introuvable ou accès refusé" };
  }

  const plant = await db.query.plants.findFirst({
    where: (p, { eq }) => eq(p.id, userPlant.plant_id),
  });

  if (!plant) {
    return { error: "Plante introuvable" };
  }

  const variety = userPlant.variety_id
    ? await db.query.varieties.findFirst({
        where: (v, { eq }) => eq(v.id, userPlant.variety_id!),
      })
    : null;

  const next_action_date = computeNextActionDate(stepType, plant);

  await db.insert(plant_steps).values({
    user_plant_id: userPlantId,
    step_type: stepType,
    completed_at: new Date(),
    notes: notes ?? null,
    next_action_date,
  });

  await db.insert(observations).values({
    user_id: session.user.id,
    plant_id: userPlant.plant_id,
    week_number: getCurrentWeek(),
    year: new Date().getFullYear(),
    content: stepObservationContent(stepType, plant.name, variety?.name),
  });

  revalidatePath(`/garden/${userPlantId}`);
  revalidatePath("/dashboard");
  revalidatePath("/journal");

  return {};
}

