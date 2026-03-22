import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { observations, plants, user_plants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentWeek } from "@/lib/calendar-utils";
import { createObservation, deleteObservation } from "./actions";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ plant?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const filterPlantId = params.plant ? parseInt(params.plant, 10) : null;
  const filterYear = params.year ? parseInt(params.year, 10) : null;

  const currentWeek = getCurrentWeek();
  const currentYear = new Date().getFullYear();

  const userPlantRows = await db
    .select({ plant: plants })
    .from(user_plants)
    .innerJoin(plants, eq(user_plants.plant_id, plants.id))
    .where(eq(user_plants.user_id, session.user.id));

  const userPlants = userPlantRows.map((r) => r.plant);

  const conditions = [eq(observations.user_id, session.user.id)];
  if (filterPlantId !== null && !isNaN(filterPlantId)) {
    conditions.push(eq(observations.plant_id, filterPlantId));
  }
  if (filterYear !== null && !isNaN(filterYear)) {
    conditions.push(eq(observations.year, filterYear));
  }

  const allObservations = await db
    .select({
      id: observations.id,
      plant_id: observations.plant_id,
      week_number: observations.week_number,
      year: observations.year,
      content: observations.content,
      created_at: observations.created_at,
    })
    .from(observations)
    .where(and(...conditions))
    .orderBy(desc(observations.year), desc(observations.week_number), desc(observations.created_at));

  const plantMap = new Map(userPlants.map((p) => [p.id, p.name]));

  type ObsRow = {
    id: number;
    plant_id: number | null;
    week_number: number;
    year: number;
    content: string;
    created_at: Date;
  };

  const grouped = new Map<string, ObsRow[]>();
  for (const obs of allObservations) {
    const key = `${obs.year}-W${obs.week_number}`;
    const group = grouped.get(key) ?? [];
    group.push(obs);
    grouped.set(key, group);
  }

  const years = Array.from(
    new Set(allObservations.map((o) => o.year))
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Journal
          </h1>
          <p className="text-sm text-[#7D766E] mt-1">
            Observations de votre jardin
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E4DE] p-5 space-y-4">
        <h2
          className="text-base font-semibold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Nouvelle observation
        </h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            const rawPlantId = formData.get("plant_id") as string;
            const plantId =
              rawPlantId && rawPlantId !== ""
                ? parseInt(rawPlantId, 10)
                : null;
            const weekNumber = parseInt(formData.get("week_number") as string, 10);
            const year = parseInt(formData.get("year") as string, 10);
            const content = formData.get("content") as string;
            await createObservation(plantId, weekNumber, year, content);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="plant_id"
                className="block text-sm font-medium text-[#3D3832] mb-1"
              >
                Plante (optionnel)
              </label>
              <select
                id="plant_id"
                name="plant_id"
                defaultValue={filterPlantId?.toString() ?? ""}
                className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
              >
                <option value="">Observation générale</option>
                {userPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="week_number"
                  className="block text-sm font-medium text-[#3D3832] mb-1"
                >
                  Semaine
                </label>
                <input
                  id="week_number"
                  name="week_number"
                  type="number"
                  min="1"
                  max="44"
                  defaultValue={currentWeek}
                  required
                  className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-medium text-[#3D3832] mb-1"
                >
                  Année
                </label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  min="2020"
                  max="2099"
                  defaultValue={currentYear}
                  required
                  className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
                />
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-[#3D3832] mb-1"
            >
              Observation
            </label>
            <textarea
              id="content"
              name="content"
              rows={3}
              required
              placeholder="Notez vos observations, conditions météo, état des plantes..."
              className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white resize-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors"
          >
            Enregistrer l&apos;observation
          </button>
        </form>
      </div>

      {(userPlants.length > 0 || years.length > 0) && (
        <div className="flex flex-wrap gap-3">
          <form className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#3D3832]">
              Plante:
            </label>
            <select
              name="plant"
              defaultValue={filterPlantId?.toString() ?? ""}
              onChange={undefined}
              className="px-3 py-1.5 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
            >
              <option value="">Toutes</option>
              {userPlants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {filterYear !== null && (
              <input type="hidden" name="year" value={filterYear} />
            )}
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium bg-[#F5F2EE] hover:bg-[#E8E4DE] text-[#3D3832] rounded-lg transition-colors"
            >
              Filtrer
            </button>
          </form>
          {years.length > 1 && (
            <form className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#3D3832]">
                Année:
              </label>
              <select
                name="year"
                defaultValue={filterYear?.toString() ?? ""}
                className="px-3 py-1.5 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
              >
                <option value="">Toutes</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {filterPlantId !== null && (
                <input type="hidden" name="plant" value={filterPlantId} />
              )}
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium bg-[#F5F2EE] hover:bg-[#E8E4DE] text-[#3D3832] rounded-lg transition-colors"
              >
                Filtrer
              </button>
            </form>
          )}
        </div>
      )}

      {allObservations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📔</p>
          <p className="text-lg font-medium text-[#3D3832]" style={{ fontFamily: "Fraunces, serif" }}>
            Aucune observation
          </p>
          <p className="text-sm text-[#7D766E] mt-2">
            Commencez à documenter votre saison de jardinage!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([weekKey, obsGroup]) => {
            const firstObs = obsGroup[0];
            return (
              <div key={weekKey}>
                <div className="flex items-center gap-3 mb-3">
                  <h2
                    className="text-sm font-semibold text-[#5C5650]"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    Semaine {firstObs.week_number}, {firstObs.year}
                  </h2>
                  <div className="flex-1 h-px bg-[#E8E4DE]" />
                </div>
                <div className="space-y-3">
                  {obsGroup.map((obs) => (
                    <div
                      key={obs.id}
                      className="bg-white rounded-xl border border-[#E8E4DE] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {obs.plant_id !== null && (
                            <p className="text-xs font-medium text-[#2D5A3D] mb-1">
                              {plantMap.get(obs.plant_id) ?? "Plante inconnue"}
                            </p>
                          )}
                          {obs.plant_id === null && (
                            <p className="text-xs font-medium text-[#7D766E] mb-1">
                              Observation générale
                            </p>
                          )}
                          <p className="text-sm text-[#3D3832]">
                            {obs.content}
                          </p>
                          <time className="text-xs text-[#A9A29A] mt-1 block">
                            {new Date(obs.created_at).toLocaleDateString("fr-CA")}
                          </time>
                        </div>
                        <form
                          action={async () => {
                            "use server";
                            await deleteObservation(obs.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs text-[#A9A29A] hover:text-[#C4463A] transition-colors shrink-0"
                            aria-label="Supprimer"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
