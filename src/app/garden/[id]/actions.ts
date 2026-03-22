"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user_plants, plants, plant_steps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNextActionDate, type StepType } from "@/lib/step-utils";

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

  const next_action_date = computeNextActionDate(stepType, plant);

  await db.insert(plant_steps).values({
    user_plant_id: userPlantId,
    step_type: stepType,
    completed_at: new Date(),
    notes: notes ?? null,
    next_action_date,
  });

  revalidatePath(`/garden/${userPlantId}`);

  return {};
}

