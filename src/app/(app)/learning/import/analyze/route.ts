import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { buildPlanFromPdf, MAX_PDF_BYTES, PlanError } from "@/lib/ai/pdf-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reading a long PDF can take a couple of minutes (matters when hosted).
export const maxDuration = 300;

// POST /learning/import/analyze  (form data: file, hint)
// Sends the PDF to Claude and returns the proposed plan as JSON. Nothing is saved yet.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only admins can import." }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload didn't arrive. Please try again." }, { status: 400 });
  }
  const file = form.get("file");
  const hint = String(form.get("hint") ?? "").trim().slice(0, 500);
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a PDF file." }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "The PDF is larger than 24 MB. Try a smaller file or split it." }, { status: 400 });
  }
  const pdf = Buffer.from(await file.arrayBuffer());
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "That file isn't a PDF." }, { status: 400 });
  }

  // Steps you've finished, so Claude can spot what's already covered (newest first).
  const finished = await db.learningStep.findMany({
    where: { done: true },
    orderBy: { doneAt: "desc" },
    take: 500,
    select: { id: true, title: true, learningPath: { select: { title: true } }, milestone: { select: { title: true } } },
  });

  try {
    const plan = await buildPlanFromPdf(
      pdf,
      finished.map((s) => ({ id: s.id, title: s.title, path: s.learningPath.title, milestone: s.milestone?.title ?? null })),
      hint,
    );
    // Names of the covering steps, for the review screen.
    const covering = Object.fromEntries(
      finished.map((s) => [s.id, { title: s.title, path: s.learningPath.title, milestone: s.milestone?.title ?? null }]),
    );
    return NextResponse.json({ plan, covering, fileName: file.name });
  } catch (error) {
    const message = error instanceof PlanError ? error.message : "Something went wrong while reading the PDF.";
    if (!(error instanceof PlanError)) console.error("PDF import failed", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
