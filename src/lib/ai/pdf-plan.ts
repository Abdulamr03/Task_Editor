import { AiError, askForJson, hasApiKey, MODEL } from "./client";

export { hasApiKey, MODEL };

// Turns a PDF (syllabus, textbook, course notes…) into a learning path plan:
// milestones → levels, and marks levels that steps you already finished cover.
// Runs on the server only. Needs ANTHROPIC_API_KEY in .env.

export const MAX_PDF_BYTES = 24 * 1024 * 1024; // base64 adds ~33%; the API takes 32 MB per request

export type ExistingStep = { id: string; title: string; path: string; milestone: string | null };

export type PlanLevel = {
  title: string;
  notes: string | null;
  estimateMinutes: number | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  pages: string | null;
  coveredBy: string | null; // id of an ExistingStep
  coveredReason: string | null;
};
export type PlanMilestone = { title: string; description: string | null; levels: PlanLevel[] };
export type Plan = { title: string; description: string | null; milestones: PlanMilestone[] };


const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

// The shape Claude must answer in (structured outputs guarantee it).
const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "milestones"],
  properties: {
    title: { type: "string", description: "Short name for the learning path, e.g. the course or book title." },
    description: nullable({ type: "string", description: "One or two sentences on what it covers." }),
    milestones: {
      type: "array",
      description: "Big stages in order, e.g. modules, parts or chapters.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "levels"],
        properties: {
          title: { type: "string" },
          description: nullable({ type: "string" }),
          levels: {
            type: "array",
            description: "Checkable steps inside the milestone, in order.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "notes", "estimateMinutes", "difficulty", "pages", "coveredBy", "coveredReason"],
              properties: {
                title: { type: "string", description: "What to learn or do, as a short action." },
                notes: nullable({ type: "string", description: "Key ideas or what 'done' looks like, one or two lines." }),
                estimateMinutes: nullable({ type: "integer", description: "Rough study time in minutes." }),
                difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"], description: "How hard this level is for a learner at this stage." },
                pages: nullable({ type: "string", description: 'Where it is in the PDF, e.g. "pp. 12–20" or "Section 3.2".' }),
                coveredBy: nullable({ type: "string", description: "id of an already finished step that covers this level, or null." }),
                coveredReason: nullable({ type: "string", description: "Why that finished step covers it, in a few words." }),
              },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You turn study material into a learning plan for a personal progress tracker.

Read the whole document and build:
- milestones: the big stages in the order a learner should follow them (modules, parts, chapters, weeks). Usually 3–12.
- levels inside each milestone: concrete, checkable steps a learner ticks off when done (a lesson, a section, an exercise set, a project). Usually 2–10 per milestone. Titles are short and start with what to do ("Read …", "Practise …", "Build …") when natural.
- for each level: short notes (key ideas or what "done" means), a rough time estimate in minutes, a difficulty (EASY, MEDIUM or HARD), and where it is in the document (pages or section) when you can tell.

Skip front matter, prefaces, indexes, references and administrative details (grading, office hours) unless they are real learning work.
Don't repeat the same topic twice in the plan.

The user also gives a list of steps they have ALREADY FINISHED in other learning paths. For each level, set coveredBy to the id of a finished step only when it clearly teaches the same thing (same topic at a similar depth), and give a short coveredReason. Otherwise set both to null. Never invent ids; use only ids from the list.

Write in the same language as the document.`;

export class PlanError extends Error {}

export async function buildPlanFromPdf(pdf: Buffer, existing: ExistingStep[], hint: string): Promise<Plan> {
  if (!hasApiKey()) throw new PlanError("No Anthropic API key is set. Add ANTHROPIC_API_KEY to your .env file and restart the app.");
  const finished = existing.map((s) => ({ id: s.id, title: s.title, path: s.path, milestone: s.milestone }));
  let raw: unknown;
  try {
    raw = await askForJson({
      system: SYSTEM,
      schema: PLAN_SCHEMA,
      maxTokens: 64000,
      what: "this PDF",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") } },
        {
          type: "text",
          text:
            `Steps I have already finished (JSON):\n${JSON.stringify(finished)}\n\n` +
            (hint ? `My note about this document: ${hint}\n\n` : "") +
            "Build the learning plan for the attached document.",
        },
      ],
    });
  } catch (error) {
    if (error instanceof AiError) {
      const m = error.message;
      if (m.startsWith("Claude couldn't handle this PDF")) {
        throw new PlanError(`${m.replace("Claude couldn't handle this PDF", "The PDF couldn't be read")} PDFs can have at most 600 pages and must not be password-protected.`);
      }
      if (m === "Claude declined this PDF.") throw new PlanError("Claude declined to read this document. Try a different PDF.");
      if (m === "Claude's answer was too long.") {
        throw new PlanError("The document is too long to plan in one go. Try a shorter PDF or add a note like “only chapters 1–5”.");
      }
      throw new PlanError(m);
    }
    throw error;
  }
  const plan = cleanPlan(raw, new Set(existing.map((s) => s.id)));
  if (plan.milestones.length === 0) throw new PlanError("No learning content was found in this PDF.");
  return plan;
}

// ---------- Checking the plan (also used when saving, for edited plans) ----------

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};

export function cleanPlan(raw: unknown, knownStepIds: Set<string>): Plan {
  const r = (raw ?? {}) as Record<string, unknown>;
  const milestones = (Array.isArray(r.milestones) ? r.milestones : []).slice(0, 50).flatMap((m): PlanMilestone[] => {
    const mm = (m ?? {}) as Record<string, unknown>;
    const title = str(mm.title, 200);
    if (!title) return [];
    const levels = (Array.isArray(mm.levels) ? mm.levels : []).slice(0, 100).flatMap((l): PlanLevel[] => {
      const ll = (l ?? {}) as Record<string, unknown>;
      const lt = str(ll.title, 200);
      if (!lt) return [];
      const est = typeof ll.estimateMinutes === "number" && Number.isInteger(ll.estimateMinutes) ? ll.estimateMinutes : null;
      const covered = typeof ll.coveredBy === "string" && knownStepIds.has(ll.coveredBy) ? ll.coveredBy : null;
      return [
        {
          title: lt,
          notes: str(ll.notes, 1000),
          estimateMinutes: est && est >= 1 && est <= 24 * 60 ? est : null,
          difficulty: ll.difficulty === "EASY" || ll.difficulty === "MEDIUM" || ll.difficulty === "HARD" ? ll.difficulty : null,
          pages: str(ll.pages, 60),
          coveredBy: covered,
          coveredReason: covered ? str(ll.coveredReason, 300) : null,
        },
      ];
    });
    return levels.length ? [{ title, description: str(mm.description, 1000), levels }] : [];
  });
  return { title: str(r.title, 100) ?? "Imported learning path", description: str(r.description, 1000), milestones };
}
