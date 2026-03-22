import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, gardens, notification_logs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForms } from "./settings-forms";
import { getAIProvider } from "@/lib/ai";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
  });

  const recentNotifications = await db
    .select()
    .from(notification_logs)
    .where(eq(notification_logs.user_id, session.user.id))
    .orderBy(desc(notification_logs.sent_at))
    .limit(5);

  const userGardens = await db.query.gardens.findMany({
    where: (g, { eq }) => eq(g.user_id, session.user.id),
  });

  const primaryGarden = userGardens[0] ?? null;
  const aiProvider = getAIProvider();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1
          className="text-3xl font-bold text-[#2A2622]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Paramètres
        </h1>
        <p className="text-sm text-[#7D766E] mt-1">
          Configurez votre profil de jardinage
        </p>
      </div>

      <SettingsForms
        user={user ? {
          climate_zone: user.climate_zone,
          location_city: user.location_city,
          location_lat: user.location_lat,
          location_lon: user.location_lon,
          soil_type: user.soil_type,
          slack_webhook: user.slack_webhook,
        } : null}
        primaryGarden={primaryGarden ? {
          id: primaryGarden.id,
          name: primaryGarden.name,
          length_m: primaryGarden.length_m,
          width_m: primaryGarden.width_m,
        } : null}
        unitPreference={(user?.unit_preference ?? "meters") as "meters" | "feet"}
        aiProvider={aiProvider}
      />

      {recentNotifications.length > 0 && (
        <Card className="border-[#E8E4DE]">
          <CardHeader className="pb-3">
            <CardTitle
              className="text-base text-[#2A2622]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Dernières notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-2 border-b border-[#F5F2EE] last:border-0"
                >
                  <span className="shrink-0 mt-0.5 text-base">
                    {log.status === "success" ? "✅" : "❌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-medium ${
                          log.status === "success"
                            ? "text-[#3D8B5D]"
                            : "text-[#C4463A]"
                        }`}
                      >
                        {log.status === "success" ? "Envoyé" : "Échec"}
                      </span>
                      <time className="text-xs text-[#A9A29A] shrink-0">
                        {new Date(log.sent_at).toLocaleDateString("fr-CA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    {log.message_preview && (
                      <p className="text-xs text-[#7D766E] mt-0.5 truncate">
                        {log.message_preview}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-xs text-[#C4463A] mt-0.5 truncate">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
