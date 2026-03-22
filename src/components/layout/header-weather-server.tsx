import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { HeaderWeather } from "./header-weather";

export async function HeaderWeatherServer() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: { location_lat: true, location_lon: true },
  });

  if (!user?.location_lat || !user?.location_lon) {
    return null;
  }

  return <HeaderWeather lat={user.location_lat} lon={user.location_lon} />;
}
