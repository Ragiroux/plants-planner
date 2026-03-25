"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user_plants, plants, plant_steps, observations, varieties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNextActionDate, stepObservationContent, type StepType } from "@/lib/step-utils";
import { getCurrentWeek } from "@/lib/calendar-utils";
import { advancePhase } from "@/app/garden/actions";

export async function logStep(
  userPlantId: number,
  stepType: StepType,
  options?: { notes?: string; quantity?: number }
): Promise<{ error?: string }> {
  const notes = options?.notes;
  const quantity = options?.quantity;

  // For repiquage/transplantation, delegate to advancePhase (handles lot splitting)
  if (stepType === "repiquage" || stepType === "transplantation") {
    const targetPhase = stepType === "repiquage" ? "repiquage" : "transplant";
    return (await advancePhase(userPlantId, targetPhase, quantity, notes)) ?? {};
  }

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

  const stepNotes =
    quantity && quantity < userPlant.quantity
      ? [notes, `${quantity} sur ${userPlant.quantity} plants`].filter(Boolean).join(" — ")
      : (notes ?? null);

  await db.insert(plant_steps).values({
    user_plant_id: userPlantId,
    step_type: stepType,
    completed_at: new Date(),
    notes: stepNotes,
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
  revalidatePath("/garden");
  revalidatePath("/dashboard");
  revalidatePath("/journal");

  return {};
}

