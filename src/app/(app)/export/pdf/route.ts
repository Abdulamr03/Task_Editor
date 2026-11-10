import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import { parseDateInput, toDateInput } from "@/lib/dates";
import { buildReport, SECTIONS, type SectionKey } from "@/lib/report/data";
import { ReportDocument } from "@/lib/report/document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /export/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD&project=<id>&path=<id>&unlinked=1&section=done…
// Returns the PDF as a download. Admins and viewers can both export.
export async function GET(request: Request) {
  const session = await readSession();
  const user = session && (await db.user.findUnique({ where: { id: session.userId }, select: { name: true } }));
  if (!user) return new Response("Please log in first.", { status: 401 });

  const q = new URL(request.url).searchParams;
  const from = parseDateInput(q.get("from"));
  const to = parseDateInput(q.get("to"));
  if (!from || from === "invalid" || !to || to === "invalid") return text("Choose a valid start and end date.");
  if (to < from) return text("The end date can't be before the start date.");
  if (to.getTime() - from.getTime() > 366 * 86_400_000) return text("Choose a range of at most one year.");

  const sections = new Set(q.getAll("section").filter((k): k is SectionKey => SECTIONS.some((x) => x.key === k)));
  if (sections.size === 0) return text("Choose at least one section to include.");

  const report = await buildReport(
    {
      from,
      to,
      projectIds: q.getAll("project").slice(0, 200),
      pathIds: q.getAll("path").slice(0, 200),
      includeUnlinked: q.get("unlinked") === "1",
      sections,
    },
    user.name,
  );

  const pdf = await renderToBuffer(createElement(ReportDocument, { report }) as Parameters<typeof renderToBuffer>[0]);
  const name = `progress-report_${toDateInput(from)}${from.getTime() === to.getTime() ? "" : `_to_${toDateInput(to)}`}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${q.get("view") === "1" ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

function text(message: string) {
  return new Response(message, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
