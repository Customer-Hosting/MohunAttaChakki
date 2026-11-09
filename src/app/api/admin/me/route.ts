import { requireAdmin } from "@/lib/firebase/admin";

// Lets the admin UI confirm access with the server. All admin APIs use the same check.
export async function GET(request: Request) {
  const { profile, error } = await requireAdmin(request);
  if (error) return error;
  return Response.json({ ok: true, name: profile.name, email: profile.email });
}
