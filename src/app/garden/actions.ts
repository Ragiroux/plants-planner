"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gardens, user_plants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  plantedDate?: string
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

  try {
    await db.insert(user_plants).values({
      user_id: session.user.id,
      garden_id: gardenId,
      plant_id: plantId,
      quantity,
      planted_date: plantedDate ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return { error: "Cette plante est déjà dans votre potager" };
    }
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
