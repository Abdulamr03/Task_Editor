import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatMinutes } from "@/lib/tasks";
import type { Report, ReportItem, ReportTask } from "./data";

// The PDF report's layout. Uses Noto Sans (in /fonts) so accents, Greek and
// Cyrillic print correctly.

const fontDir = path.join(process.cwd(), "fonts");
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(fontDir, "NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
});
// Don't split words with hyphens.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const RED = "#b91c1c";

const s = StyleSheet.create({
  page: { fontFamily: "Noto Sans", fontSize: 10, color: INK, paddingTop: 40, paddingBottom: 50, paddingHorizontal: 44 },
  // No lineHeight on the page or on wrapping views: there it hides the page
  // numbers and doubles spacing (PDF library quirks). Set it per text instead.
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.25 },
  subtitle: { fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.3 },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 6 },
  summary: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 8 },
  tile: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 8 },
  tileLabel: { fontSize: 8, color: MUTED },
  tileValue: { fontSize: 15, fontWeight: 700, marginTop: 2, lineHeight: 1.3 },
  item: { marginTop: 16, paddingLeft: 10, borderLeftWidth: 3 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  itemName: { fontSize: 14, fontWeight: 700, lineHeight: 1.3, flexShrink: 1, paddingRight: 8 },
  itemKind: { fontSize: 8.5, color: MUTED },
  desc: { color: MUTED, marginTop: 3, lineHeight: 1.35 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: MUTED },
  track: { height: 5, backgroundColor: LINE, borderRadius: 3, marginTop: 3 },
  fill: { height: 5, borderRadius: 3 },
  h3: { fontSize: 9, fontWeight: 700, color: MUTED, marginTop: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  li: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  liText: { flex: 1, paddingRight: 8, lineHeight: 1.3 },
  liSide: { fontSize: 8.5, color: MUTED },
  empty: { color: MUTED, fontSize: 9 },
  notes: { marginTop: 2, lineHeight: 1.35 },
  footerLeft: { position: "absolute", bottom: 24, left: 44, fontSize: 8, color: MUTED },
  footerRight: { position: "absolute", bottom: 24, left: 44, right: 44, textAlign: "right", fontSize: 8, color: MUTED },
});

const STATUS = { ACTIVE: "Active", PAUSED: "Paused", DONE: "Done", ARCHIVED: "Archived" } as const;

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const localDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function ReportDocument({ report }: { report: Report }) {
  const { options, summary } = report;
  const has = (k: Parameters<typeof options.sections.has>[0]) => options.sections.has(k);
  const range = options.from.getTime() === options.to.getTime() ? day(options.from) : `${day(options.from)} – ${day(options.to)}`;

  return (
    <Document title={`Progress report ${range}`} author={report.userName} creator="Task Editor">
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Progress report</Text>
        <Text style={s.subtitle}>{range}</Text>
        <Text style={s.meta}>
          {report.userName} · created {report.generatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        </Text>

        <View style={s.summary}>
          {has("done") && <Tile label="Tasks finished" value={String(summary.tasksDone)} />}
          {has("open") && <Tile label="Tasks still open" value={String(summary.tasksPlanned - summary.tasksDone)} />}
          {has("done") && <Tile label="Learning steps done" value={String(summary.stepsDone)} />}
          {has("time") && <Tile label="Time logged" value={summary.minutes ? formatMinutes(summary.minutes) : "0"} />}
        </View>

        {report.items.length === 0 && !report.unlinked && (
          <Text style={[s.empty, { marginTop: 16 }]}>No projects or learning paths were chosen for this report.</Text>
        )}

        {report.items.map((item, i) => (
          <Item key={i} item={item} has={has} />
        ))}

        {report.unlinked && (
          <View style={[s.item, { borderLeftColor: "#94a3b8" }]}>
            <Text style={s.itemName}>Other tasks</Text>
            <Text style={s.desc}>Tasks not linked to a project or learning path.</Text>
            {has("time") && (
              <View style={s.row}>
                <Text>Time logged in this period: {report.unlinked.minutes ? formatMinutes(report.unlinked.minutes) : "none"}</Text>
              </View>
            )}
            {has("done") && <TaskList title="Tasks finished" tasks={report.unlinked.doneTasks} done />}
            {has("open") && <TaskList title="Unfinished tasks" tasks={report.unlinked.openTasks} />}
          </View>
        )}

        {/* On every page. */}
        <Text style={s.footerLeft} fixed>
          Task Editor · {range}
        </Text>
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}</Text>
    </View>
  );
}

function Item({ item, has }: { item: ReportItem; has: (k: "open" | "done" | "progress" | "time" | "notes") => boolean }) {
  const pct = item.progress.total ? Math.round((item.progress.done / item.progress.total) * 100) : 0;
  return (
    <View style={[s.item, { borderLeftColor: item.color }]} wrap>
      <View style={s.itemHead} minPresenceAhead={60}>
        <Text style={s.itemName}>{item.name}</Text>
        <Text style={s.itemKind}>
          {item.kind === "project" ? "Project" : "Learning path"} · {STATUS[item.status]}
          {item.dueDate ? ` · due ${day(item.dueDate)}` : ""}
        </Text>
      </View>
      {has("notes") && item.description && <Text style={s.desc}>{item.description}</Text>}

      {has("progress") && (
        <View>
          <View style={s.row}>
            <Text>
              {item.progress.total === 0
                ? `No ${item.progress.unit} yet`
                : `${item.progress.done} of ${item.progress.total} ${item.progress.unit} done (overall)`}
              {item.nextStep ? ` · next: ${item.nextStep}` : ""}
            </Text>
            <Text>{pct}%</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
          </View>
        </View>
      )}

      {has("time") && (
        <View style={s.row}>
          <Text>Time logged in this period: {item.minutes ? formatMinutes(item.minutes) : "none"}</Text>
        </View>
      )}

      {has("done") && (
        <>
          {item.kind === "path" && (
            <Section
              title="Steps finished"
              rows={item.doneSteps.map((st, i) => (
                <View key={i} style={s.li} wrap={false}>
                  <Text style={s.liText}>• {st.title}</Text>
                  <Text style={s.liSide}>{localDay(st.doneAt)}</Text>
                </View>
              ))}
            />
          )}
          <TaskList title="Tasks finished" tasks={item.doneTasks} done />
        </>
      )}

      {has("open") && <TaskList title="Unfinished tasks" tasks={item.openTasks} />}

      {has("notes") && item.notes && (
        <View>
          <View wrap={false}>
            <Text style={s.h3}>Notes</Text>
            <Text style={s.notes}>{firstLine(item.notes)}</Text>
          </View>
          {restLines(item.notes) && <Text style={s.notes}>{restLines(item.notes)}</Text>}
        </View>
      )}
    </View>
  );
}

function TaskList({ title, tasks, done = false }: { title: string; tasks: ReportTask[]; done?: boolean }) {
  return (
    <Section
      title={title}
      rows={tasks.map((t, i) => {
        const late = !done && t.date < todayUTC();
        return (
          <View key={i} style={s.li} wrap={false}>
            <Text style={s.liText}>
              • {t.title}
              {t.priority === "HIGH" ? "  (high priority)" : ""}
              {t.status === "IN_PROGRESS" ? "  (in progress)" : ""}
            </Text>
            <Text style={[s.liSide, late ? { color: RED } : {}]}>
              {t.estimateMinutes ? `${formatMinutes(t.estimateMinutes)} · ` : ""}
              {done && t.completedAt ? `done ${localDay(t.completedAt)}` : `${late ? "overdue · " : ""}${shortDay(t.date)}`}
            </Text>
          </View>
        );
      })}
    />
  );
}

// A small heading and its rows. The heading never sits alone at the bottom
// of a page: it's kept in one block with the first row.
function Section({ title, rows }: { title: string; rows: React.ReactNode[] }) {
  return (
    <View>
      <View wrap={false}>
        <Text style={s.h3}>{title}</Text>
        {rows.length === 0 ? <Text style={s.empty}>None in this period.</Text> : rows[0]}
      </View>
      {rows.slice(1)}
    </View>
  );
}

const firstLine = (text: string) => text.split("\n")[0];
const restLines = (text: string) => text.split("\n").slice(1).join("\n");

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
