import { connection } from "next/server";
import { MongoServerError } from "mongodb";
import { getDb } from "@/lib/db";

// Simple deployment check: confirms the server can reach MongoDB and read the app's data.
// Never returns connection details or error messages — only MongoDB's error code name.
export async function GET() {
  await connection();
  let db;
  try {
    db = await getDb();
    await db.command({ ping: 1 });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
  try {
    await db.collection("users").findOne({}, { projection: { _id: 1 } });
    return Response.json({ ok: true, database: "connected", read: "ok" });
  } catch (error) {
    const code = error instanceof MongoServerError ? error.codeName ?? String(error.code) : "unknown";
    return Response.json({ ok: false, database: "connected", read: "failed", code }, { status: 503 });
  }
}
