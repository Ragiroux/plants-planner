"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, gardens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUnitPreference(unit: "meters" | "feet") {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  await db
    .update(users)
    .set({ unit_preference: unit, updated_at: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function updateClimateZone(zone: "zone_3_4" | "zone_5_6") {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  await db
    .update(users)
    .set({ climate_zone: zone, updated_at: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLocation(
  city: string,
  lat: number | null,
  lon: number | null
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Geocode city if lat/lon not provided
  if (lat == null || lon == null) {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (apiKey && city.trim()) {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city.trim())},CA&limit=1&appid=${apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            lat = data[0].lat;
            lon = data[0].lon;
          }
        }
      } catch {
        // Geocoding failed — continue without coordinates
      }
    }
  }

  await db
    .update(users)
    .set({
      location_city: city,
      location_lat: lat ?? undefined,
      location_lon: lon ?? undefined,
      updated_at: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function updateSoilType(soilType: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  await db
    .update(users)
    .set({ soil_type: soilType, updated_at: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function updateSlackWebhook(webhookUrl: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    return { error: "URL invalide" };
  }

  if (parsedUrl.protocol !== "https:") {
    return { error: "L'URL doit utiliser HTTPS" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test from PlantesPlanner" }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        error: `Échec du test: le serveur a répondu ${response.status}`,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort") || message.includes("timeout")) {
      return { error: "Délai dépassé lors du test du webhook" };
    }
    return { error: "Impossible de joindre le webhook" };
  }

  await db
    .update(users)
    .set({ slack_webhook: webhookUrl, updated_at: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function updateGardenDimensions(
  gardenId: number,
  length: number,
  width: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  if (length <= 0) {
    return { error: "La longueur doit être supérieure à 0" };
  }
  if (width <= 0) {
    return { error: "La largeur doit être supérieure à 0" };
  }

  const garden = await db.query.gardens.findFirst({
    where: (g, { eq, and }) =>
      and(eq(g.id, gardenId), eq(g.user_id, session.user.id)),
  });

  if (!garden) {
    return { error: "Potager introuvable" };
  }

  await db
    .update(gardens)
    .set({ length_m: length, width_m: width })
    .where(
      and(eq(gardens.id, gardenId), eq(gardens.user_id, session.user.id))
    );

  revalidatePath("/settings");
  revalidatePath("/garden");
  revalidatePath("/dashboard");
  return { success: true };
}
