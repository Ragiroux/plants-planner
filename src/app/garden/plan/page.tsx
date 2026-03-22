import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gardens, user_plants, plants, companion_plants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GardenPlan } from "@/components/garden/garden-plan";
import { saveLayout } from "./actions";

export default async function GardenPlanPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userGardens = await db.query.gardens.findMany({
    where: (g, { eq }) => eq(g.user_id, session.user.id),
  });

  if (userGardens.length === 0) {
    redirect("/garden");
  }

  const garden = userGardens[0];

  const userPlantRows = await db
    .select({
      userPlant: user_plants,
      plant: plants,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  const plantIds = userPlantRows.map((r) => r.plant.id);

  const companionRows =
    plantIds.length >= 2
      ? await db.query.companion_plants.findMany({
          where: (cp, { inArray, or, and }) =>
            or(
              and(
                inArray(cp.plant_a_id, plantIds),
                inArray(cp.plant_b_id, plantIds)
              )
            ),
        })
      : [];

  return (
    <GardenPlan
      garden={garden}
      userPlants={userPlantRows}
      companionRelationships={companionRows}
      onSaveLayout={saveLayout}
    />
  );
}
