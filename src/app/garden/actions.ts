"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gardens, user_plants, plant_steps, plants, observations, varieties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { stepObservationContent } from "@/lib/step-utils";
import { getCurrentWeek } from "@/lib/calendar-utils";

export async function createGarden(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const name = formData.get("name") as string;
  const lengthRaw = formData.get("length_m");
  const widthRaw = formData.get("width_m");

  const length_m = parseFloat(lengthRaw as string);
  const width_m = parseFloat(widthRaw as string);

  if (!name || name.trim() === "") {
    return { error: "Le nom du potager est requis" };
  }
  if (isNaN(length_m) || length_m <= 0) {
    return { error: "La longueur doit être supérieure à 0" };
  }
  if (isNaN(width_m) || width_m <= 0) {
    return { error: "La largeur doit être supérieure à 0" };
  }

  await db.insert(gardens).values({
    user_id: session.user.id,
    name: name.trim(),
    length_m,
    width_m,
  });

  revalidatePath("/garden");
  revalidatePath("/dashboard");
}

export async function addPlant(
  gardenId: number,
  plantId: number,
  quantity: number,
  plantedDate?: string,
  sowingType?: "indoor" | "outdoor",
  varietyId?: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  if (quantity <= 0) {
    return { error: "La quantité doit être supérieure à 0" };
  }

  const garden = await db.query.gardens.findFirst({
    where: (g, { eq, and }) =>
      and(eq(g.id, gardenId), eq(g.user_id, session.user.id)),
  });

  if (!garden) {
    return { error: "Potager introuvable" };
  }

  if (varietyId) {
    const variety = await db.query.varieties.findFirst({
      where: (v, { eq, and }) =>
        and(eq(v.id, varietyId), eq(v.plant_id, plantId)),
    });
    if (!variety) {
      return { error: "Variété invalide pour cette plante" };
    }
  }

  try {
    await db.insert(user_plants).values({
      user_id: session.user.id,
      garden_id: gardenId,
      plant_id: plantId,
      variety_id: varietyId ?? null,
      quantity,
      planted_date: plantedDate ?? null,
      sowing_type: sowingType ?? null,
    });
  } catch {
    return { error: "Erreur lors de l'ajout de la plante" };
  }

  revalidatePath("/garden");
  revalidatePath("/garden/add");
  revalidatePath("/dashboard");
}

export async function removePlant(userPlantId: number) {
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

  await db.delete(user_plants).where(eq(user_plants.id, userPlantId));

  revalidatePath("/garden");
  revalidatePath("/dashboard");
}

export async function updatePlantQuantity(
  userPlantId: number,
  quantity: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  if (quantity <= 0) {
    return { error: "La quantité doit être supérieure à 0" };
  }

  const userPlant = await db.query.user_plants.findFirst({
    where: (up, { eq }) => eq(up.id, userPlantId),
  });

  if (!userPlant || userPlant.user_id !== session.user.id) {
    return { error: "Plante introuvable ou accès refusé" };
  }

  await db
    .update(user_plants)
    .set({ quantity })
    .where(
      and(eq(user_plants.id, userPlantId), eq(user_plants.user_id, session.user.id))
    );

  revalidatePath("/garden");
  revalidatePath("/dashboard");
}

export async function advancePhase(
  userPlantId: number,
  targetPhase: "repiquage" | "transplant",
  quantity?: number,
  notes?: string
) {
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

  if (!userPlant.planted_date) {
    return { error: "Date de plantation requise" };
  }

  if (targetPhase === "transplant" && !userPlant.repiquage_at && userPlant.sowing_type !== "indoor") {
    return { error: "Le repiquage doit être fait avant la transplantation" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const stepType = targetPhase === "repiquage" ? "repiquage" : "transplantation";
  const advanceQty = quantity ?? userPlant.quantity;

  // Fetch plant name and variety for observation
  const plant = await db.query.plants.findFirst({
    where: (p, { eq }) => eq(p.id, userPlant.plant_id),
  });

  const variety = userPlant.variety_id
    ? await db.query.varieties.findFirst({
        where: (v, { eq }) => eq(v.id, userPlant.variety_id!),
      })
    : null;

  if (advanceQty < 1 || advanceQty > userPlant.quantity) {
    return { error: "Quantité invalide" };
  }

  if (advanceQty < userPlant.quantity) {
    // Split: reduce original quantity, create new record with advanced phase
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
        repiquage_at: targetPhase === "repiquage" ? today : userPlant.repiquage_at,
        transplant_at: targetPhase === "transplant" ? today : userPlant.transplant_at,
        notes: userPlant.notes,
        sowing_type: userPlant.sowing_type,
        variety_id: userPlant.variety_id,
      })
      .returning({ id: user_plants.id });

    await db.insert(plant_steps).values({
      user_plant_id: newRecord.id,
      step_type: stepType as "repiquage" | "transplantation",
      completed_at: new Date(),
      notes: notes ?? null,
    });
  } else {
    // Advance all: update in place
    const update =
      targetPhase === "repiquage"
        ? { repiquage_at: today }
        : { transplant_at: today };

    await db
      .update(user_plants)
      .set(update)
      .where(eq(user_plants.id, userPlantId));

    await db.insert(plant_steps).values({
      user_plant_id: userPlantId,
      step_type: stepType as "repiquage" | "transplantation",
      completed_at: new Date(),
      notes: notes ?? null,
    });
  }

  // Auto-create journal observation
  if (plant) {
    await db.insert(observations).values({
      user_id: session.user.id,
      plant_id: userPlant.plant_id,
      week_number: getCurrentWeek(),
      year: new Date().getFullYear(),
      content: stepObservationContent(stepType as "repiquage" | "transplantation", plant.name, variety?.name),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/garden");
  revalidatePath("/journal");
}

export async function createVariety(
  plantId: number,
  name: string
): Promise<{ id: number; name: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) {
    return { error: "Le nom de la variété est requis" };
  }

  try {
    const [created] = await db
      .insert(varieties)
      .values({ plant_id: plantId, name: trimmed })
      .returning({ id: varieties.id, name: varieties.name });
    revalidatePath("/garden/add");
    return created;
  } catch {
    // Likely unique constraint — return existing
    const existing = await db.query.varieties.findFirst({
      where: (v, { eq, and }) =>
        and(eq(v.plant_id, plantId), eq(v.name, trimmed)),
    });
    if (existing) {
      return { id: existing.id, name: existing.name };
    }
    return { error: "Erreur lors de la création de la variété" };
  }
}

export async function updateVariety(
  userPlantId: number,
  varietyId: number | null
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

  if (varietyId !== null) {
    const variety = await db.query.varieties.findFirst({
      where: (v, { eq, and }) =>
        and(eq(v.id, varietyId), eq(v.plant_id, userPlant.plant_id)),
    });
    if (!variety) {
      return { error: "Variété invalide pour cette plante" };
    }
  }

  await db
    .update(user_plants)
    .set({ variety_id: varietyId })
    .where(
      and(eq(user_plants.id, userPlantId), eq(user_plants.user_id, session.user.id))
    );

  revalidatePath("/garden");
  revalidatePath(`/garden/${userPlantId}`);
  revalidatePath("/dashboard");
  return {};
}
