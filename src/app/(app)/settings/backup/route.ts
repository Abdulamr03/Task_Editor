import { currentUser } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /settings/backup — downloads all data as task-editor-backup-<date>.json (admins only).
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Please log in first.", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Only admins can download backups.", { status: 403 });

  const backup = await buildBackup();
  const day = backup.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="task-editor-backup-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
