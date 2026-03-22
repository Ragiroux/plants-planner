import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chat_messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  const messages = await db
    .select({
      id: chat_messages.id,
      role: chat_messages.role,
      content: chat_messages.content,
      created_at: chat_messages.created_at,
    })
    .from(chat_messages)
    .where(eq(chat_messages.user_id, userId))
    .orderBy(desc(chat_messages.created_at))
    .limit(20);

  return NextResponse.json({ messages: messages.reverse() });
}
