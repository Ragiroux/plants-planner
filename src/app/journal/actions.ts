"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { observations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createObservation(
  plantId: number | null,
  weekNumber: number,
  year: number,
  content: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  if (weekNumber < 1 || weekNumber > 44) {
    return { error: "Le numéro de semaine doit être entre 1 et 44" };
  }

  if (!content || content.trim() === "") {
    return { error: "L'observation ne peut pas être vide" };
  }

  await db.insert(observations).values({
    user_id: session.user.id,
    plant_id: plantId,
    week_number: weekNumber,
    year,
    content: content.trim(),
  });

  revalidatePath("/journal");

  return {};
}

export async function deleteObservation(
  observationId: number
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const observation = await db.query.observations.findFirst({
    where: (o, { eq }) => eq(o.id, observationId),
  });

  if (!observation || observation.user_id !== session.user.id) {
    return { error: "Observation introuvable ou accès refusé" };
  }

  await db
    .delete(observations)
    .where(
      and(
        eq(observations.id, observationId),
        eq(observations.user_id, session.user.id)
      )
    );

  revalidatePath("/journal");

  return {};
}
