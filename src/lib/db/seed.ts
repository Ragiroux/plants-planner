import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import { plants as plantSeedData } from "./seed-data";
import { companions as companionSeedData } from "./companion-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seedPlants(): Promise<Map<string, number>> {
  console.log(`Seeding ${plantSeedData.length} plants...`);
  const slugToId = new Map<string, number>();

  for (const plant of plantSeedData) {
    const existing = await db
      .select({ id: schema.plants.id })
      .from(schema.plants)
      .where(eq(schema.plants.slug, plant.slug))
      .limit(1);

    let plantId: number;

    if (existing.length > 0) {
      plantId = existing[0].id;
      await db
        .update(schema.plants)
        .set({
          name: plant.name,
          spacing_cm: plant.spacingCm,
          row_spacing_cm: plant.rowSpacingCm,
          sun_exposure: plant.sunExposure,
          frost_tolerance: plant.frostTolerance,
          watering_freq: plant.wateringFreq,
          ideal_temp_min: plant.idealTempMin,
          ideal_temp_max: plant.idealTempMax,
          days_indoor_to_repiquage: plant.daysIndoorToRepiquage,
          days_repiquage_to_transplant: plant.daysRepiquageToTransplant,
          days_transplant_to_harvest: plant.daysTransplantToHarvest,
        })
        .where(eq(schema.plants.id, plantId));
      console.log(`  Updated plant: ${plant.name}`);
    } else {
      const inserted = await db
        .insert(schema.plants)
        .values({
          name: plant.name,
          slug: plant.slug,
          spacing_cm: plant.spacingCm,
          row_spacing_cm: plant.rowSpacingCm,
          sun_exposure: plant.sunExposure,
          frost_tolerance: plant.frostTolerance,
          watering_freq: plant.wateringFreq,
          ideal_temp_min: plant.idealTempMin,
          ideal_temp_max: plant.idealTempMax,
          days_indoor_to_repiquage: plant.daysIndoorToRepiquage,
          days_repiquage_to_transplant: plant.daysRepiquageToTransplant,
          days_transplant_to_harvest: plant.daysTransplantToHarvest,
        })
        .returning({ id: schema.plants.id });
      plantId = inserted[0].id;
      console.log(`  Inserted plant: ${plant.name}`);
    }

    slugToId.set(plant.slug, plantId);
  }

  return slugToId;
}

async function seedCalendars(slugToId: Map<string, number>): Promise<void> {
  console.log("Seeding plant calendars...");

  for (const plant of plantSeedData) {
    const plantId = slugToId.get(plant.slug);
    if (plantId === undefined) {
      console.warn(`  Skipping calendars for unknown slug: ${plant.slug}`);
      continue;
    }

    const zoneEntries: Array<{
      zone: "zone_3_4" | "zone_5_6";
      data: (typeof plant.zones)["zone_3_4"];
    }> = [
      { zone: "zone_3_4", data: plant.zones.zone_3_4 },
      { zone: "zone_5_6", data: plant.zones.zone_5_6 },
    ];

    for (const { zone, data } of zoneEntries) {
      const existing = await db
        .select({ id: schema.plant_calendars.id })
        .from(schema.plant_calendars)
        .where(
          and(
            eq(schema.plant_calendars.plant_id, plantId),
            eq(schema.plant_calendars.zone, zone)
          )
        )
        .limit(1);

      const calendarValues = {
        plant_id: plantId,
        zone,
        indoor_sow_start: data.indoorSowStart,
        indoor_sow_end: data.indoorSowEnd,
        transplant_start: data.transplantStart,
        transplant_end: data.transplantEnd,
        outdoor_sow_start: data.outdoorSowStart,
        outdoor_sow_end: data.outdoorSowEnd,
        garden_transplant_start: data.gardenTransplantStart,
        garden_transplant_end: data.gardenTransplantEnd,
        harvest_start: data.harvestStart,
        harvest_end: data.harvestEnd,
        luminosity: data.luminosity,
        depth_mm: data.depthMm,
        germination_temp_min: data.germinationTempMin,
        germination_temp_max: data.germinationTempMax,
        height_cm: data.heightCm,
        days_to_maturity_min: data.daysToMaturityMin,
        days_to_maturity_max: data.daysToMaturityMax,
        sowing_method: data.sowingMethod,
      };

      if (existing.length > 0) {
        await db
          .update(schema.plant_calendars)
          .set(calendarValues)
          .where(eq(schema.plant_calendars.id, existing[0].id));
      } else {
        await db.insert(schema.plant_calendars).values(calendarValues);
      }
    }

    console.log(`  Calendars seeded for: ${plant.name}`);
  }
}

async function seedCompanions(slugToId: Map<string, number>): Promise<void> {
  console.log(`Seeding ${companionSeedData.length} companion relationships...`);
  let inserted = 0;
  let skipped = 0;

  for (const companion of companionSeedData) {
    const idA = slugToId.get(companion.plantASlug);
    const idB = slugToId.get(companion.plantBSlug);

    if (idA === undefined) {
      console.warn(`  Skipping: unknown slug "${companion.plantASlug}"`);
      skipped++;
      continue;
    }
    if (idB === undefined) {
      console.warn(`  Skipping: unknown slug "${companion.plantBSlug}"`);
      skipped++;
      continue;
    }
    if (idA === idB) {
      console.warn(
        `  Skipping: same plant on both sides "${companion.plantASlug}"`
      );
      skipped++;
      continue;
    }

    const plantAId = Math.min(idA, idB);
    const plantBId = Math.max(idA, idB);

    const existing = await db
      .select({ id: schema.companion_plants.id })
      .from(schema.companion_plants)
      .where(
        and(
          eq(schema.companion_plants.plant_a_id, plantAId),
          eq(schema.companion_plants.plant_b_id, plantBId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.companion_plants)
        .set({
          relationship: companion.relationship,
          reason: companion.reason,
        })
        .where(eq(schema.companion_plants.id, existing[0].id));
    } else {
      await db.insert(schema.companion_plants).values({
        plant_a_id: plantAId,
        plant_b_id: plantBId,
        relationship: companion.relationship,
        reason: companion.reason,
      });
      inserted++;
    }
  }

  console.log(
    `  Companion relationships: ${inserted} inserted, ${skipped} skipped`
  );
}

async function main(): Promise<void> {
  console.log("Starting seed...");

  const slugToId = await seedPlants();
  console.log(`Plants seeded: ${slugToId.size}`);

  await seedCalendars(slugToId);
  console.log("Calendars seeded.");

  await seedCompanions(slugToId);
  console.log("Companions seeded.");

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  client.end().finally(() => process.exit(1));
});
