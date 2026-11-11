import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { BackupError, currentCounts, parseBackup, restoreBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 50 * 1024 * 1024;

// POST /settings/backup/restore  (form data: file, mode = "check" | "restore")
// "check" only reads the file and reports what's in it; "restore" replaces all data.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only admins can restore backups." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const mode = form?.get("mode") === "restore" ? "restore" : "check";
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a backup file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The file is larger than 50 MB." }, { status: 400 });

  let parsed;
  try {
    parsed = parseBackup(JSON.parse(await file.text()));
  } catch (error) {
    const message =
      error instanceof BackupError ? error.message : error instanceof SyntaxError ? "This file isn't valid JSON." : "The backup couldn't be read.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (mode === "check") {
    return NextResponse.json({ exportedAt: parsed.exportedAt, counts: parsed.counts, current: await currentCounts(), fixes: parsed.fixes });
  }

  try {
    await restoreBackup(parsed.data);
  } catch (error) {
    console.error("Restore failed", error);
    return NextResponse.json({ error: "Restoring failed, so nothing was changed. Your data is as it was." }, { status: 500 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ restored: true, counts: await currentCounts() });
}
