"use server";

import { db } from "@/lib/db";
import { companion_plants, plants } from "@/lib/db/schema";
import { or, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface CompanionResult {
  id: number;
  name: string;
  relationship: "beneficial" | "antagonistic";
  reason: string | null;
}

export async function getCompanionsForPlant(
  plantId: number
): Promise<CompanionResult[]> {
  const plantA = alias(plants, "plant_a");
  const plantB = alias(plants, "plant_b");

  const rows = await db
    .select({
      id: companion_plants.id,
      plantAId: companion_plants.plant_a_id,
      plantBId: companion_plants.plant_b_id,
      relationship: companion_plants.relationship,
      reason: companion_plants.reason,
      plantAName: plantA.name,
      plantBName: plantB.name,
    })
    .from(companion_plants)
    .innerJoin(plantA, eq(companion_plants.plant_a_id, plantA.id))
    .innerJoin(plantB, eq(companion_plants.plant_b_id, plantB.id))
    .where(
      or(
        eq(companion_plants.plant_a_id, plantId),
        eq(companion_plants.plant_b_id, plantId)
      )
    );

  return rows.map((row) => {
    const isPlantA = row.plantAId === plantId;
    return {
      id: row.id,
      name: isPlantA ? row.plantBName : row.plantAName,
      relationship: row.relationship,
      reason: row.reason,
    };
  });
}
