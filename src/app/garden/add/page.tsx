import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { plants, user_plants, gardens, companion_plants, plant_calendars } from "@/lib/db/schema";
import { eq, inArray, or, and } from "drizzle-orm";
import Link from "next/link";
import { PlantSearchFilter } from "@/components/garden/plant-search-filter";
import { getCurrentWeek } from "@/lib/calendar-utils";

export default async function GardenAddPage() {
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

  const primaryGarden = userGardens[0];

  const zone = session.user.climate_zone ?? "zone_5_6";
  const currentWeek = getCurrentWeek();

  const allPlants = await db
    .select({
      id: plants.id,
      name: plants.name,
      spacing_cm: plants.spacing_cm,
      row_spacing_cm: plants.row_spacing_cm,
      sun_exposure: plants.sun_exposure,
      frost_tolerance: plants.frost_tolerance,
      default_indoor_to_transplant: plants.default_indoor_to_transplant,
    })
    .from(plants)
    .orderBy(plants.name);

  const existingUserPlants = await db
    .select({ plant_id: user_plants.plant_id })
    .from(user_plants)
    .where(eq(user_plants.user_id, session.user.id));

  const gardenPlantIds = existingUserPlants.map((up) => up.plant_id);
  const allPlantIds = allPlants.map((p) => p.id);

  const calendarRows = allPlantIds.length > 0
    ? await db
        .select({
          plant_id: plant_calendars.plant_id,
          outdoor_sow_start: plant_calendars.outdoor_sow_start,
          outdoor_sow_end: plant_calendars.outdoor_sow_end,
          indoor_sow_start: plant_calendars.indoor_sow_start,
          indoor_sow_end: plant_calendars.indoor_sow_end,
          days_to_maturity_min: plant_calendars.days_to_maturity_min,
          days_to_maturity_max: plant_calendars.days_to_maturity_max,
        })
        .from(plant_calendars)
        .where(
          and(
            inArray(plant_calendars.plant_id, allPlantIds),
            eq(plant_calendars.zone, zone)
          )
        )
    : [];

  const calendarData = new Map(calendarRows.map((c) => [c.plant_id, c]));

  const indoorDurations = new Map(
    allPlants
      .filter((p) => p.default_indoor_to_transplant !== null)
      .map((p) => [p.id, p.default_indoor_to_transplant as number])
  );

  let companionRows: Array<{
    candidatePlantId: number;
    relationship: "beneficial" | "antagonistic";
    reason: string | null;
    gardenPlantName: string;
  }> = [];

  if (gardenPlantIds.length > 0) {
    const rawCompanions = await db
      .select({
        plant_a_id: companion_plants.plant_a_id,
        plant_b_id: companion_plants.plant_b_id,
        relationship: companion_plants.relationship,
        reason: companion_plants.reason,
      })
      .from(companion_plants)
      .where(
        or(
          inArray(companion_plants.plant_a_id, gardenPlantIds),
          inArray(companion_plants.plant_b_id, gardenPlantIds)
        )
      );

    const gardenPlantNames = await db
      .select({ id: plants.id, name: plants.name })
      .from(plants)
      .where(inArray(plants.id, gardenPlantIds));

    const gardenPlantNameMap = new Map(gardenPlantNames.map((p) => [p.id, p.name]));

    for (const c of rawCompanions) {
      // If plant_a is in garden, show on plant_b's card (the candidate)
      if (gardenPlantIds.includes(c.plant_a_id)) {
        companionRows.push({
          candidatePlantId: c.plant_b_id,
          relationship: c.relationship,
          reason: c.reason,
          gardenPlantName: gardenPlantNameMap.get(c.plant_a_id) ?? "",
        });
      }
      // If plant_b is in garden, show on plant_a's card (the candidate)
      if (gardenPlantIds.includes(c.plant_b_id)) {
        companionRows.push({
          candidatePlantId: c.plant_a_id,
          relationship: c.relationship,
          reason: c.reason,
          gardenPlantName: gardenPlantNameMap.get(c.plant_b_id) ?? "",
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/garden"
          className="text-sm text-[#7D766E] hover:text-[#2D5A3D] transition-colors"
        >
          ← Mon potager
        </Link>
      </div>

      <div>
        <h1
          className="text-3xl font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Ajouter une plante
        </h1>
        <p className="text-sm text-[#7D766E] mt-1">
          Choisissez parmi nos {allPlants.length} variétés disponibles
        </p>
      </div>

      <PlantSearchFilter
        plants={allPlants}
        gardenId={primaryGarden.id}
        gardenPlantIds={gardenPlantIds}
        companionData={companionRows}
        calendarData={Object.fromEntries(calendarData)}
        currentWeek={currentWeek}
        zone={zone}
        indoorDurations={Object.fromEntries(indoorDurations)}
      />
    </div>
  );
}
