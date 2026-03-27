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

  // Germination: split the lot like advancePhase does for repiquage/transplant
  if (stepType === "germination") {
    const today = new Date().toISOString().slice(0, 10);
    const advanceQty = quantity ?? userPlant.quantity;

    if (advanceQty < 1 || advanceQty > userPlant.quantity) {
      return { error: "Quantité invalide" };
    }

    let newRecordId: number | null = null;

    if (advanceQty < userPlant.quantity) {
      // Split: reduce original quantity, create new record with germinated_at
      await db
        .update(user_plants)
        .set({ quantity: userPlant.quantity - advanceQty })
        .where(eq(user_plants.id, userPlantId));

      const [newRecord] = await db
        .insert(user_plants)
        .values({
          user_id: userPlant.user_id,
          garden_id: userPlant.garden_id,
          plant_id: userPlant.plant_id,
          quantity: advanceQty,
          planted_date: userPlant.planted_date,
          repiquage_at: userPlant.repiquage_at,
          transplant_at: userPlant.transplant_at,
          germinated_at: today,
          notes: userPlant.notes,
          sowing_type: userPlant.sowing_type,
          variety_id: userPlant.variety_id,
        })
        .returning({ id: user_plants.id });

      newRecordId = newRecord.id;

      await db.insert(plant_steps).values({
        user_plant_id: newRecord.id,
        step_type: "germination",
        completed_at: new Date(),
        notes: notes ?? null,
      });
    } else {
      // Advance all: update in place
      await db
        .update(user_plants)
        .set({ germinated_at: today })
        .where(eq(user_plants.id, userPlantId));

      await db.insert(plant_steps).values({
        user_plant_id: userPlantId,
        step_type: "germination",
        completed_at: new Date(),
        notes: notes ?? null,
      });
    }

    // Auto-create journal observation
    await db.insert(observations).values({
      user_id: session.user.id,
      plant_id: userPlant.plant_id,
      week_number: getCurrentWeek(),
      year: new Date().getFullYear(),
      content: stepObservationContent("germination", plant.name, variety?.name),
    });

    revalidatePath("/dashboard");
    revalidatePath("/garden");
    revalidatePath(`/garden/${userPlantId}`);
    if (newRecordId) revalidatePath(`/garden/${newRecordId}`);
    revalidatePath("/journal");

    return {};
  }

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

