"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gardens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveLayout(gardenId: number, layoutJson: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  const garden = await db.query.gardens.findFirst({
    where: (g, { eq, and }) =>
      and(eq(g.id, gardenId), eq(g.user_id, session.user.id)),
  });

  if (!garden) {
    return { error: "Potager introuvable ou accès refusé" };
  }

  await db
    .update(gardens)
    .set({ layout_json: layoutJson })
    .where(
      and(eq(gardens.id, gardenId), eq(gardens.user_id, session.user.id))
    );

  revalidatePath("/garden/plan");

  return { success: true };
}
