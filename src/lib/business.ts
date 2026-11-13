import { cookies } from "next/headers";
import { db } from "@/lib/db";

// The app shows one business at a time. The current one is remembered in a cookie;
// without it we fall back to the oldest business (the seeded demo).
export const BUSINESS_COOKIE = "business_id";

export async function getCurrentBusinessId(): Promise<string | null> {
  const id = (await cookies()).get(BUSINESS_COOKIE)?.value;
  if (id && (await db.business.findUnique({ where: { id }, select: { id: true } }))) return id;
  const first = await db.business.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return first?.id ?? null;
}

export async function getCurrentBusiness() {
  const id = await getCurrentBusinessId();
  return id ? db.business.findUnique({ where: { id } }) : null;
}
