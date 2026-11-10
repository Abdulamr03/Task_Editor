import { requireAdmin } from "@/lib/auth";
import { hasApiKey, MODEL } from "@/lib/ai/pdf-plan";
import { Card, PageHeader } from "@/components/ui";
import { ImportFlow } from "./import-flow";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();

  return (
    <main className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Import from PDF" back={{ href: "/learning", label: "Learning paths" }} />
      <p className="-mt-4 text-slate-500">
        Upload a syllabus, textbook or course notes. Claude reads it and proposes a learning path with milestones and levels, and
        ticks levels you&apos;ve already finished in other learning paths. You check everything before it&apos;s saved.
      </p>

      {hasApiKey() ? (
        <ImportFlow />
      ) : (
        <Card className="border-amber-500/40">
          <h2 className="mb-2 font-semibold">One-time setup: add an Anthropic API key</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              Create a key at <span className="font-mono">console.anthropic.com</span> → API keys (it&apos;s billed per use, separately
              from a Claude chat subscription).
            </li>
            <li>
              Open the <span className="font-mono">.env</span> file in the project and add a line:{" "}
              <span className="font-mono">ANTHROPIC_API_KEY=&quot;sk-ant-…&quot;</span>
            </li>
            <li>
              Stop the app (<span className="font-mono">Ctrl + C</span>) and start it again with{" "}
              <span className="font-mono">npm run dev</span>.
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">Model used: {MODEL}. The PDF is sent to Anthropic to be read.</p>
        </Card>
      )}
    </main>
  );
}
