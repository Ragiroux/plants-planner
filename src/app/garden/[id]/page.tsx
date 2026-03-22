import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  user_plants,
  plants,
  plant_calendars,
  plant_steps,
  observations,
} from "@/lib/db/schema";
import { eq, and, desc, lt, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentWeek } from "@/lib/calendar-utils";
import { removePlant } from "../actions";
import { logStep } from "./actions";

const sunLabels: Record<string, string> = {
  soleil: "Plein soleil",
  mi_ombre: "Mi-ombre",
  ombre: "Ombre",
};

const frostLabels: Record<string, string> = {
  hardy: "Résistant au gel",
  semi_hardy: "Semi-résistant",
  tender: "Sensible au gel",
};

const stepTypeLabels: Record<string, string> = {
  semis_interieur: "🌱 Semis intérieur",
  semis_exterieur: "🌿 Semis extérieur",
  repiquage: "🪴 Repiquage",
  transplantation: "🏡 Transplantation",
  entretien: "🔧 Entretien",
  arrosage: "💧 Arrosage",
  fertilisation: "🧪 Fertilisation",
  recolte: "🍅 Récolte",
};

const STEP_TYPE_OPTIONS = [
  "semis_interieur",
  "semis_exterieur",
  "repiquage",
  "transplantation",
  "entretien",
  "arrosage",
  "fertilisation",
  "recolte",
] as const;

const CALENDAR_PHASES = [
  {
    key: "indoor_sow",
    startField: "indoor_sow_start",
    endField: "indoor_sow_end",
    label: "Semis intérieur",
    color: "#E8912D",
  },
  {
    key: "transplant",
    startField: "transplant_start",
    endField: "transplant_end",
    label: "Repiquage",
    color: "#D45FA0",
  },
  {
    key: "outdoor_sow",
    startField: "outdoor_sow_start",
    endField: "outdoor_sow_end",
    label: "Semis extérieur",
    color: "#D4C24A",
  },
  {
    key: "garden_transplant",
    startField: "garden_transplant_start",
    endField: "garden_transplant_end",
    label: "Au jardin",
    color: "#4A9E4A",
  },
  {
    key: "harvest",
    startField: "harvest_start",
    endField: "harvest_end",
    label: "Récolte",
    color: "#C0392B",
  },
] as const;

const WEEK_MIN = 1;
const WEEK_MAX = 44;

function weekToPercent(week: number): number {
  return ((week - WEEK_MIN) / (WEEK_MAX - WEEK_MIN)) * 100;
}

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const userPlantId = parseInt(id, 10);
  if (isNaN(userPlantId)) {
    notFound();
  }

  const userPlant = await db.query.user_plants.findFirst({
    where: (up, { eq }) => eq(up.id, userPlantId),
  });

  if (!userPlant || userPlant.user_id !== session.user.id) {
    notFound();
  }

  const plant = await db.query.plants.findFirst({
    where: (p, { eq }) => eq(p.id, userPlant.plant_id),
  });

  if (!plant) {
    notFound();
  }

  const zone = session.user.climate_zone ?? "zone_5_6";

  const calendar = await db.query.plant_calendars.findFirst({
    where: (pc, { eq, and }) =>
      and(eq(pc.plant_id, plant.id), eq(pc.zone, zone)),
  });

  const steps = await db
    .select()
    .from(plant_steps)
    .where(eq(plant_steps.user_plant_id, userPlantId))
    .orderBy(desc(plant_steps.completed_at));

  const pastObservations = await db
    .select()
    .from(observations)
    .where(
      and(
        eq(observations.user_id, session.user.id),
        eq(observations.plant_id, plant.id)
      )
    )
    .orderBy(desc(observations.created_at));

  const currentWeek = getCurrentWeek();
  const currentYear = new Date().getFullYear();
  const weekMin = Math.max(1, currentWeek - 2);
  const weekMax = Math.min(44, currentWeek + 2);

  const yearOverYearObservations = await db
    .select()
    .from(observations)
    .where(
      and(
        eq(observations.user_id, session.user.id),
        eq(observations.plant_id, plant.id),
        lt(observations.year, currentYear),
        gte(observations.week_number, weekMin),
        lte(observations.week_number, weekMax)
      )
    )
    .orderBy(desc(observations.year), desc(observations.week_number));

  const currentWeekPercent = weekToPercent(currentWeek);

  const calendarRecord = calendar as Record<string, number | null | string> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/garden"
          className="text-sm text-[#7D766E] hover:text-[#2D5A3D] transition-colors"
        >
          ← Mon jardin
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {plant.name}
          </h1>
          <p className="text-sm text-[#7D766E] mt-1">
            Quantité: {userPlant.quantity}
          </p>
          {userPlant.planted_date && (() => {
            const plantedDateObj = new Date(userPlant.planted_date + "T00:00:00");
            const todayObj = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
            const daysDiff = Math.floor((todayObj.getTime() - plantedDateObj.getTime()) / (24 * 60 * 60 * 1000));
            const formattedDate = plantedDateObj.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <p className="text-sm text-[#7D766E] mt-0.5">
                Semé le{" "}
                <span className="font-medium text-[#3D3832]">{formattedDate}</span>
                {" — "}
                <span className="text-[#A9A29A]">
                  {daysDiff === 0
                    ? "aujourd'hui"
                    : daysDiff === 1
                    ? "il y a 1 jour"
                    : `il y a ${daysDiff} jours`}
                </span>
              </p>
            );
          })()}
        </div>
        <form
          action={async () => {
            "use server";
            await removePlant(userPlantId);
            redirect("/garden");
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-[#C4463A] border border-[#C4463A] rounded-lg hover:bg-[#FEE2E2] transition-colors"
          >
            Retirer du jardin
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plant.spacing_cm && plant.row_spacing_cm && (
              <div className="flex justify-between text-sm">
                <span className="text-[#7D766E]">Espacement</span>
                <span className="font-medium text-[#3D3832]">
                  {plant.spacing_cm} × {plant.row_spacing_cm} cm
                </span>
              </div>
            )}
            {plant.sun_exposure && (
              <div className="flex justify-between text-sm">
                <span className="text-[#7D766E]">Ensoleillement</span>
                <span className="font-medium text-[#3D3832]">
                  {sunLabels[plant.sun_exposure] ?? plant.sun_exposure}
                </span>
              </div>
            )}
            {plant.frost_tolerance && (
              <div className="flex justify-between text-sm">
                <span className="text-[#7D766E]">Tolérance au gel</span>
                <span className="font-medium text-[#3D3832]">
                  {frostLabels[plant.frost_tolerance] ?? plant.frost_tolerance}
                </span>
              </div>
            )}
            {plant.ideal_temp_min !== null && plant.ideal_temp_max !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-[#7D766E]">Températures idéales</span>
                <span className="font-medium text-[#3D3832]">
                  {plant.ideal_temp_min}°C – {plant.ideal_temp_max}°C
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Calendrier — Zone{" "}
              {zone === "zone_3_4" ? "3-4" : "5-6"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!calendar ? (
              <p className="text-sm text-[#7D766E]">
                Aucune donnée de calendrier disponible.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="relative h-4 bg-[#F5F2EE] rounded-full overflow-hidden">
                  {CALENDAR_PHASES.map((phase) => {
                    const start = calendarRecord?.[phase.startField] as number | null;
                    const end = calendarRecord?.[phase.endField] as number | null;
                    if (start === null || end === null || start === undefined || end === undefined) return null;
                    const left = weekToPercent(start);
                    const width = weekToPercent(end) - left;
                    return (
                      <div
                        key={phase.key}
                        className="absolute top-0 h-full rounded-sm"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: phase.color,
                        }}
                        title={`${phase.label}: sem. ${start}–${end}`}
                      />
                    );
                  })}
                  <div
                    className="absolute top-0 w-0.5 h-full"
                    style={{
                      left: `${currentWeekPercent}%`,
                      backgroundColor: "#E8A317",
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {CALENDAR_PHASES.filter((phase) => {
                    const start = calendarRecord?.[phase.startField] as number | null;
                    const end = calendarRecord?.[phase.endField] as number | null;
                    return start !== null && end !== null && start !== undefined && end !== undefined;
                  }).map((phase) => (
                    <span
                      key={phase.key}
                      className="inline-flex items-center gap-1.5 text-xs text-[#5C5650]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm inline-block"
                        style={{ backgroundColor: phase.color }}
                      />
                      {phase.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E8E4DE]">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base text-[#2A2622]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Enregistrer une étape
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              const stepType = formData.get("step_type") as string;
              const notes = (formData.get("notes") as string) || undefined;
              await logStep(
                userPlantId,
                stepType as Parameters<typeof logStep>[1],
                notes
              );
            }}
            className="space-y-3"
          >
            <div>
              <label
                htmlFor="step_type"
                className="block text-sm font-medium text-[#3D3832] mb-1"
              >
                Type d&apos;étape
              </label>
              <select
                id="step_type"
                name="step_type"
                required
                className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white"
              >
                {STEP_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {stepTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-[#3D3832] mb-1"
              >
                Notes (optionnel)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Observations, conditions..."
                className="w-full px-3 py-2 border border-[#E8E4DE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] bg-white resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Historique des étapes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step) => {
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue =
                  step.next_action_date !== null &&
                  step.next_action_date < today;
                return (
                  <div
                    key={step.id}
                    className="flex items-start justify-between gap-3 py-2 border-b border-[#F5F2EE] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#3D3832]">
                        {stepTypeLabels[step.step_type] ?? step.step_type}
                      </p>
                      {step.notes && (
                        <p className="text-xs text-[#7D766E] mt-0.5 truncate">
                          {step.notes}
                        </p>
                      )}
                      {step.next_action_date && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-[#A9A29A]">
                            Prochaine action:{" "}
                            {new Date(step.next_action_date + "T00:00:00").toLocaleDateString(
                              "fr-CA"
                            )}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#D4973B]/15 text-[#D4973B]">
                              En retard
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <time className="text-xs text-[#A9A29A] shrink-0 pt-0.5">
                      {new Date(step.completed_at).toLocaleDateString("fr-CA")}
                    </time>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {pastObservations.length > 0 && (
        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Observations passées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastObservations.map((obs) => (
                <div
                  key={obs.id}
                  className="py-2 border-b border-[#F5F2EE] last:border-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#5C5650]">
                      Semaine {obs.week_number}, {obs.year}
                    </span>
                  </div>
                  <p className="text-sm text-[#3D3832]">{obs.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {yearOverYearObservations.length > 0 && (
        <Card className="border-[#E8E4DE]" style={{ backgroundColor: "#FFFBEB" }}>
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#92400E]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Observations des saisons passées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {yearOverYearObservations.map((obs) => {
                const yearsAgo = currentYear - obs.year;
                const label =
                  yearsAgo === 1 ? "L'an dernier" : `Il y a ${yearsAgo} ans`;
                return (
                  <div
                    key={obs.id}
                    className="py-2 border-b border-[#FDE68A] last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#92400E]">
                        {label}, semaine {obs.week_number}
                      </span>
                    </div>
                    <p className="text-sm text-[#78350F]">{obs.content}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link
          href={`/journal?plant=${plant.id}`}
          className="px-4 py-2 text-sm font-medium bg-[#2D5A3D] hover:bg-[#3D7A52] text-white rounded-lg transition-colors"
        >
          Écrire une observation
        </Link>
      </div>
    </div>
  );
}
