import { setUserRole, toUserProfile, upsertUserFromAuth } from "@/lib/data/users";
import { isAdminEmail, requireUser } from "@/lib/firebase/admin";
import { cleanName, normalizePhone, phoneFromLoginEmail } from "@/lib/validation";

/**
 * Creates or updates the signed-in user's MongoDB record and returns their profile.
 * Called after signup (with name + phone) and on every login / page load (empty body).
 *
 * - Identity (uid, email) always comes from the verified Firebase token, never the body.
 * - Only `name` and `phone` are read from the body; any `role` field is ignored.
 * - New users are always created as "customer". Admin is granted only server-side,
 *   when the email is listed in ADMIN_EMAILS.
 */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // Empty body is fine (login / refresh).
  }

  let name: string | null = null;
  let phone: string | null = null;
  if (body.name !== undefined) {
    name = cleanName(body.name);
    if (!name) return Response.json({ error: "Please enter your name (2–80 characters)." }, { status: 400 });
  }
  if (body.phone !== undefined) {
    phone = normalizePhone(body.phone);
    if (!phone) return Response.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }
  // Customers without an email log in with their mobile number, so it must stay the number they
  // log in with.
  const loginPhone = phoneFromLoginEmail(user.email);
  if (loginPhone && phone && phone !== loginPhone) {
    return Response.json({ error: "Your mobile number is your login, so it cannot be changed here." }, { status: 400 });
  }

  try {
    let doc = await upsertUserFromAuth(user, { name, phone });
    // The role follows ADMIN_EMAILS both ways: listed emails become admin, and an account whose
    // email was removed goes back to customer (admin access itself is already blocked by
    // requireAdmin, this keeps the stored role and the Users page truthful).
    const shouldBeAdmin = isAdminEmail(user.email);
    if (doc.role !== "admin" && shouldBeAdmin) {
      doc = (await setUserRole(user.uid, "admin")) ?? doc;
    } else if (doc.role === "admin" && !shouldBeAdmin) {
      doc = (await setUserRole(user.uid, "customer")) ?? doc;
    }
    return Response.json({ profile: toUserProfile(doc) });
  } catch (err) {
    console.error("auth/sync failed", err);
    return Response.json({ error: "Could not save your account details. Please try again." }, { status: 500 });
  }
}
