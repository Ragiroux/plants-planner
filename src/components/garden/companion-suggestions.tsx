import { db } from "@/lib/db";
import { companion_plants, plants } from "@/lib/db/schema";
import { eq, or, and, inArray } from "drizzle-orm";

interface CompanionSuggestionsProps {
  targetPlantId: number;
  gardenPlantIds: number[];
}

export async function CompanionSuggestions({
  targetPlantId,
  gardenPlantIds,
}: CompanionSuggestionsProps) {
  if (gardenPlantIds.length === 0) {
    return null;
  }

  const companions = await db
    .select({
      relationship: companion_plants.relationship,
      reason: companion_plants.reason,
      plant_a_id: companion_plants.plant_a_id,
      plant_b_id: companion_plants.plant_b_id,
    })
    .from(companion_plants)
    .where(
      or(
        and(
          eq(companion_plants.plant_a_id, targetPlantId),
          inArray(companion_plants.plant_b_id, gardenPlantIds)
        ),
        and(
          eq(companion_plants.plant_b_id, targetPlantId),
          inArray(companion_plants.plant_a_id, gardenPlantIds)
        )
      )
    );

  if (companions.length === 0) {
    return null;
  }

  const partnerIds = companions.map((c) =>
    c.plant_a_id === targetPlantId ? c.plant_b_id : c.plant_a_id
  );

  const partnerPlants = await db
    .select({ id: plants.id, name: plants.name })
    .from(plants)
    .where(inArray(plants.id, partnerIds));

  const plantMap = new Map(partnerPlants.map((p) => [p.id, p.name]));

  const beneficial = companions.filter((c) => c.relationship === "beneficial");
  const antagonistic = companions.filter(
    (c) => c.relationship === "antagonistic"
  );

  return (
    <div className="space-y-3">
      {beneficial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#3D8B5D] uppercase tracking-wide mb-2">
            Associations bénéfiques avec votre jardin
          </p>
          <div className="flex flex-wrap gap-2">
            {beneficial.map((c, i) => {
              const partnerId =
                c.plant_a_id === targetPlantId ? c.plant_b_id : c.plant_a_id;
              const partnerName = plantMap.get(partnerId) ?? "Plante inconnue";
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#166534]"
                  title={c.reason ?? undefined}
                >
                  ✓ {partnerName}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {antagonistic.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#C4463A] uppercase tracking-wide mb-2">
            Associations déconseillées avec votre jardin
          </p>
          <div className="flex flex-wrap gap-2">
            {antagonistic.map((c, i) => {
              const partnerId =
                c.plant_a_id === targetPlantId ? c.plant_b_id : c.plant_a_id;
              const partnerName = plantMap.get(partnerId) ?? "Plante inconnue";
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#991B1B]"
                  title={c.reason ?? undefined}
                >
                  ✗ {partnerName}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
