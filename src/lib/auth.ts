import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Demo gate: write actions need the shared DEMO_PASSCODE (stored in a cookie after entering it once).
// When DEMO_PASSCODE is not set (local development), writes are open.
export const PASSCODE_COOKIE = "demo_passcode";

export async function hasWriteAccess(): Promise<boolean> {
  const passcode = process.env.DEMO_PASSCODE;
  if (!passcode) return true;
  return (await cookies()).get(PASSCODE_COOKIE)?.value === passcode;
}

/** Call at the top of every server action that writes. Sends visitors to /unlock. */
export async function requireWriteAccess(next = "/home") {
  if (!(await hasWriteAccess())) redirect(`/unlock?next=${encodeURIComponent(next)}`);
}
