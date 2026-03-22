import { auth, signOut } from "@/lib/auth";
import { UserMenu } from "./user-menu";

export async function HeaderUserMenu() {
  const session = await auth();

  if (!session?.user) return null;

  return (
    <UserMenu
      name={session.user.name}
      email={session.user.email}
      image={session.user.image}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
