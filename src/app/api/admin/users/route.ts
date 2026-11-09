import { handle } from "@/lib/api";
import { countUsers, listUsers } from "@/lib/data/users";
import { isAdminEmail, requireAdmin } from "@/lib/firebase/admin";

/** GET ?page= → registered users (no passwords — those live only in Firebase). */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
    const pageSize = 50;
    const [users, total] = await Promise.all([listUsers({ limit: pageSize, skip: (page - 1) * pageSize }), countUsers()]);
    // Show the role that actually applies: "admin" only while the email is also in ADMIN_EMAILS
    // (the same rule requireAdmin uses), so removing an email updates this list immediately.
    const shown = users.map((u) => (u.role === "admin" && !isAdminEmail(u.email) ? { ...u, role: "customer" as const } : u));
    return Response.json({ users: shown, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  });
}
