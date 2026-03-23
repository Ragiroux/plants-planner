import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gardens, user_plants, plants, plant_calendars } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentWeek } from "@/lib/calendar-utils";
import { createGarden } from "./actions";
import { toMeters, unitLabel, type UnitPreference } from "@/lib/units";
import { getPlantEmoji, getStatusLabel } from "@/lib/plant-utils";
import type { PlantCalendar } from "@/lib/plant-utils";

export default async function GardenPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentWeek = getCurrentWeek();
  const zone = session.user.climate_zone ?? "zone_5_6";

  const userProfile = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: { unit_preference: true },
  });
  const unitPref = (userProfile?.unit_preference ?? "meters") as UnitPreference;

  const userGardens = await db.query.gardens.findMany({
    where: (g, { eq }) => eq(g.user_id, session.user.id),
  });

  const hasGarden = userGardens.length > 0;
  const primaryGarden = userGardens[0];

  let gardenPlants: Array<{
    userPlant: typeof user_plants.$inferSelect;
    plant: typeof plants.$inferSelect;
    calendar: PlantCalendar | null;
  }> = [];

  if (hasGarden) {
    const rows = await db
      .select({
        userPlant: user_plants,
        plant: plants,
      })
      .from(user_plants)
      .innerJoin(plants, eq(user_plants.plant_id, plants.id))
      .where(eq(user_plants.user_id, session.user.id));

    const plantIds = rows.map((r) => r.plant.id);
    const calendars =
      plantIds.length > 0
        ? await db
            .select()
            .from(plant_calendars)
            .where(
              and(
                inArray(plant_calendars.plant_id, plantIds),
                eq(plant_calendars.zone, zone)
              )
            )
        : [];
    const calendarMap = new Map(calendars.map((c) => [c.plant_id, c]));

    for (const row of rows) {
      const cal = calendarMap.get(row.plant.id) ?? null;
      gardenPlants.push({
        userPlant: row.userPlant,
        plant: row.plant,
        calendar: cal,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Mon potager
          </h1>
          {primaryGarden && (
            <p className="text-sm text-[#7D766E] mt-1">{primaryGarden.name}</p>
          )}
        </div>
        {hasGarden && (
          <div className="flex items-center gap-2">
            <Link
              href="/garden/plan"
              className="inline-flex h-9 items-center px-4 border border-[#2D5A3D] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Voir le plan
            </Link>
            <Link
              href="/garden/add"
              className="inline-flex h-9 items-center px-4 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Ajouter une plante
            </Link>
          </div>
        )}
      </div>

      {!hasGarden && (
        <Card className="border-[#E8E4DE]">
          <CardHeader>
            <CardTitle
              className="text-xl text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Créer votre potager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#7D766E] mb-6">
              Commencez par créer votre potager pour suivre vos plantes et
              planifier votre saison.
            </p>
            <form
              action={async (formData: FormData) => {
                "use server";
                const { toMeters } = await import("@/lib/units");
                const unit = unitPref as "meters" | "feet";
                const lengthRaw = parseFloat(formData.get("length_m") as string);
                const widthRaw = parseFloat(formData.get("width_m") as string);
                if (!isNaN(lengthRaw)) formData.set("length_m", String(toMeters(lengthRaw, unit)));
                if (!isNaN(widthRaw)) formData.set("width_m", String(toMeters(widthRaw, unit)));
                await createGarden(formData);
              }}
              className="space-y-4 max-w-sm"
            >
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[#3D3832] mb-1"
                >
                  Nom du potager
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue="Mon potager"
                  required
                  className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="length_m"
                    className="block text-sm font-medium text-[#3D3832] mb-1"
                  >
                    {`Longueur (${unitLabel(unitPref)})`}
                  </label>
                  <input
                    id="length_m"
                    name="length_m"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="5"
                    required
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="width_m"
                    className="block text-sm font-medium text-[#3D3832] mb-1"
                  >
                    {`Largeur (${unitLabel(unitPref)})`}
                  </label>
                  <input
                    id="width_m"
                    name="width_m"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="3"
                    required
                    className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors"
              >
                Créer le potager
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {hasGarden && gardenPlants.length === 0 && (
        <div className="flex justify-center py-10">
          <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-10 max-w-md w-full text-center space-y-3">
            <span className="text-5xl">🌱</span>
            <h2
              className="text-xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Votre potager est prêt!
            </h2>
            <p className="text-sm text-[#7D766E]">
              Ajoutez vos premières plantes pour commencer à planifier votre
              saison.
            </p>
            <Link
              href="/garden/add"
              className="inline-flex h-9 items-center px-6 bg-[#2D5A3D] hover:bg-[#3D7A52] text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Ajouter une plante
            </Link>
          </div>
        </div>
      )}

      {gardenPlants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gardenPlants.map(({ userPlant, plant, calendar }) => {
            const status = getStatusLabel(calendar, currentWeek);
            const emoji = getPlantEmoji(plant.name);
            return (
              <Link key={userPlant.id} href={`/garden/${userPlant.id}`}>
                <Card className="border-[#E8E4DE] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                          <h3
                            className="font-semibold text-[#2A2622] text-base leading-tight"
                            style={{ fontFamily: "Fraunces, serif" }}
                          >
                            {plant.name}
                          </h3>
                          <p className="text-xs text-[#7D766E] mt-0.5">
                            Qté: {userPlant.quantity}
                          </p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {plant.spacing_cm && plant.row_spacing_cm && (
                      <p className="text-xs text-[#7D766E]">
                        Espacement: {plant.spacing_cm} × {plant.row_spacing_cm} cm
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
