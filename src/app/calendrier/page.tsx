import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  user_plants,
  plants,
  plant_calendars,
} from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { CalendarTimeline } from "@/components/dashboard/calendar-timeline";
import { CalendarLegend } from "@/components/dashboard/legend";
import {
  getCurrentWeek,
  getWeekLabel,
  getFrenchDate,
} from "@/lib/calendar-utils";

export default async function CalendrierPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.climate_zone) {
    redirect("/onboarding");
  }

  const zone = session.user.climate_zone;
  const currentWeek = getCurrentWeek();
  const weekLabel = getWeekLabel(currentWeek);
  const today = new Date();
  const frenchDate = getFrenchDate(today);

  const userPlantRows = await db
    .select({
      userPlant: user_plants,
      plant: plants,
    })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  const plantIds = userPlantRows.map((r) => r.plant.id);

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

  const plantRows = userPlantRows.map((row) => ({
    id: row.userPlant.id,
    name: row.plant.name,
    quantity: row.userPlant.quantity,
    plantedDate: row.userPlant.planted_date ?? null,
    daysIndoorToRepiquage: row.plant.days_indoor_to_repiquage ?? null,
    daysRepiquageToTransplant: row.plant.days_repiquage_to_transplant ?? null,
    daysTransplantToHarvest: row.plant.days_transplant_to_harvest ?? null,
    calendar: calendarMap.get(row.plant.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Calendrier
          </h1>
          <p className="text-sm text-[#7D766E] mt-1">
            {frenchDate} — {weekLabel}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#2D5A3D]/10 text-[#2D5A3D]">
          Zone {zone === "zone_3_4" ? "3-4" : "5-6"}
        </span>
      </div>

      {plantRows.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-10 max-w-md w-full text-center space-y-3">
            <span className="text-5xl">🌱</span>
            <h2
              className="text-xl font-bold text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Aucune plante dans votre potager
            </h2>
            <p className="text-sm text-[#7D766E]">
              Ajoutez des plantes pour voir votre calendrier personnalisé.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E4DE] p-4 md:p-6 space-y-4">
          <CalendarTimeline plants={plantRows} currentWeek={currentWeek} />
          <div className="pt-2 border-t border-[#F5F2EE]">
            <CalendarLegend />
          </div>
        </div>
      )}
    </div>
  );
}
