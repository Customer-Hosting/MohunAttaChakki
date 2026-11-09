"use client";

import { useEffect, useState } from "react";
import type { UserSummary } from "@/lib/types";
import { Alert, formatDate, Loading, PageTitle } from "./ui";
import { useAdminApi } from "./useAdminApi";

export default function UserList() {
  const api = useAdminApi();
  const [data, setData] = useState<{ users: UserSummary[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ users: UserSummary[]; total: number }>("/api/admin/users").then((r) => (r.ok ? setData(r.data) : setError(r.error)));
  }, [api]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Loading />;

  return (
    <>
      <PageTitle title="Users" />
      <p className="-mt-3 mb-4 text-sm text-ink/60">{data.total} registered user{data.total === 1 ? "" : "s"} (newest first). Passwords are stored only by Firebase.</p>
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.users.map((u) => (
              <tr key={u.id} data-testid="admin-user-row">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 break-all">{u.email || <span className="text-ink/40" title="Signed up with mobile number only">—</span>}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "admin" ? "bg-brand" : "bg-neutral-100"}`}>{u.role}</span>
                </td>
                <td className="p-3 whitespace-nowrap">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
