import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { DailyStatement, FranchiseSummary, StatementTotals } from "../statement";
import { formatBps, formatSaasRate } from "../fee-schedule";

const NAVY = "#0d3d85";
const INK = "#1c1f26";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const TINT = "#f3f6fd";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 36, fontFamily: "Helvetica", fontSize: 9, color: INK },
  header: { marginBottom: 18 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 14 },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  parties: { flexDirection: "row", gap: 12, marginBottom: 16 },
  party: { flex: 1, borderWidth: 1, borderColor: RULE, borderRadius: 4, padding: 10 },
  partyLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 },
  partyLine: { color: MUTED, marginTop: 1 },
  tiles: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tile: { flex: 1, backgroundColor: TINT, borderRadius: 4, padding: 10 },
  tileHighlight: { backgroundColor: NAVY },
  tileLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 },
  tileLabelLight: { color: "#c7d6f5" },
  tileValue: { fontFamily: "Helvetica-Bold", fontSize: 15, marginTop: 4 },
  tileValueLight: { color: "#ffffff" },
  tileNote: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: NAVY, marginBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: RULE },
  headRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: INK },
  head: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  totalRow: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1.5, borderTopColor: INK },
  bold: { fontFamily: "Helvetica-Bold" },
  num: { textAlign: "right" },
  muted: { color: MUTED },
  note: { fontSize: 8, color: MUTED, marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 6,
  },
});

function money(cents: number) {
  const abs = (Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return cents < 0 ? `-${abs}` : abs;
}

/** A deduction, shown with a minus sign. Zero stays plain. */
function less(cents: number) {
  return cents === 0 ? money(0) : money(-cents);
}

function longDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function timeOf(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

function stamp(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function zoneName(timeZone: string, day: string) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date(`${day}T12:00:00Z`))
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone
  );
}

type Column = { width: string | number; align?: "right" };
type TextStyle = (typeof styles)[keyof typeof styles];

function Cells({ columns, values, style }: { columns: Column[]; values: ReactNode[]; style?: TextStyle }) {
  return (
    <>
      {columns.map((column, index) => (
        <Text
          key={index}
          style={[{ width: column.width }, column.align === "right" ? styles.num : {}, style ?? {}]}
        >
          {values[index]}
        </Text>
      ))}
    </>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{left}</Text>
      <Text>Payments processed by Coinflow · Sandbox demo, not a tax document</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function Tile({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <View style={[styles.tile, highlight ? styles.tileHighlight : {}]}>
      <Text style={[styles.tileLabel, highlight ? styles.tileLabelLight : {}]}>{label}</Text>
      <Text style={[styles.tileValue, highlight ? styles.tileValueLight : {}]}>{value}</Text>
      {note && <Text style={[styles.tileNote, highlight ? styles.tileLabelLight : {}]}>{note}</Text>}
    </View>
  );
}

function SummaryTiles({ totals, settledTo = "the restaurant" }: { totals: StatementTotals; settledTo?: string }) {
  return (
    <View style={styles.tiles}>
      <Tile label="Gross sales" value={money(totals.grossCents)} note={`${totals.count} settled payments`} />
      <Tile
        label="Total fees"
        value={less(totals.grossCents - totals.netCents)}
        note="Processing, franchise, SaaS and hardware"
      />
      <Tile label="Net deposit" value={money(totals.netCents)} note={`Settled to ${settledTo}`} highlight />
    </View>
  );
}

const WATERFALL: Column[] = [{ width: "70%" }, { width: "30%", align: "right" }];

function Waterfall({ statement }: { statement: DailyStatement }) {
  const { totals, schedule, charges, franchise } = statement;
  const rows: [string, string][] = [
    [`Gross sales (${totals.count} payments)`, money(totals.grossCents)],
    [`Less: processing fee (${formatSaasRate(schedule)} per payment)`, less(totals.processingCents)],
    [
      `Less: franchise fee (${formatBps(charges.franchiseFeeBps)} of gross, to ${franchise.name})`,
      less(totals.franchiseFeeCents),
    ],
    [`Less: SaaS fee (${money(charges.saasMonthlyCents)}/mo, prorated)`, less(totals.saasCents)],
    [
      `Less: hardware (${charges.devicesPerLocation} devices × ${money(charges.hardwareMonthlyCentsPerDevice)}/mo, prorated)`,
      less(totals.hardwareCents),
    ],
  ];
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Summary</Text>
      {rows.map((row) => (
        <View key={row[0]} style={styles.row}>
          <Cells columns={WATERFALL} values={row} />
        </View>
      ))}
      <View style={styles.totalRow}>
        <Cells columns={WATERFALL} values={["Net deposit", money(totals.netCents)]} style={styles.bold} />
      </View>
    </View>
  );
}

const TX_COLUMNS: Column[] = [
  { width: "10%" },
  { width: "18%" },
  { width: "16%" },
  { width: "13%", align: "right" },
  { width: "14%", align: "right" },
  { width: "16%", align: "right" },
  { width: "13%", align: "right" },
];

function Transactions({ statement }: { statement: DailyStatement }) {
  const { lines, totals, timeZone } = statement;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payments</Text>
      <View style={styles.headRow} wrap={false}>
        <Cells
          columns={TX_COLUMNS}
          values={["Time", "Payment", "Method", "Gross", "Processing", "Franchise fee", "Net"]}
          style={styles.head}
        />
      </View>
      {lines.length === 0 ? (
        <View style={styles.row}>
          <Text style={styles.muted}>No settled payments on this day.</Text>
        </View>
      ) : (
        lines.map((line) => (
          <View key={line.id} style={styles.row} wrap={false}>
            <Cells
              columns={TX_COLUMNS}
              values={[
                timeOf(line.createdAt, timeZone),
                shortId(line.id),
                line.method,
                money(line.grossCents),
                less(line.processingCents),
                less(line.franchiseFeeCents),
                money(line.netCents),
              ]}
            />
          </View>
        ))
      )}
      <View style={styles.totalRow} wrap={false}>
        <Cells
          columns={TX_COLUMNS}
          values={[
            "Total",
            "",
            "",
            money(totals.grossCents),
            less(totals.processingCents),
            less(totals.franchiseFeeCents),
            money(totals.grossCents - totals.processingCents - totals.franchiseFeeCents),
          ]}
          style={styles.bold}
        />
      </View>
      <Text style={styles.note}>
        SaaS and hardware are monthly fees prorated to the day and deducted once, not per payment.
      </Text>
    </View>
  );
}

function StatementPage({ statement }: { statement: DailyStatement }) {
  const { location, franchise, day, timeZone } = statement;
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Statement</Text>
        <Text style={styles.meta}>{longDate(day)}</Text>
        <Text style={styles.meta}>No. {statement.number}</Text>
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Restaurant</Text>
          <Text style={styles.partyName}>
            {franchise.name} · {location.city}
          </Text>
          <Text style={styles.partyLine}>{location.label}</Text>
          <Text style={styles.partyLine}>
            {location.city}, {location.state}
          </Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Account</Text>
          <Text style={styles.partyLine}>Store ID: {location.id}</Text>
          <Text style={styles.partyLine}>Coinflow sub-merchant: {location.submerchantId}</Text>
          <Text style={styles.partyLine}>
            Business day: 12:00 AM to 11:59 PM {zoneName(timeZone, day)}
          </Text>
          <Text style={styles.partyLine}>Generated {stamp(statement.generatedAt, timeZone)}</Text>
        </View>
      </View>

      <SummaryTiles totals={statement.totals} />
      <Waterfall statement={statement} />
      <Transactions statement={statement} />
      <Footer left={statement.number} />
    </Page>
  );
}

const SUMMARY_COLUMNS: Column[] = [
  { width: "20%" },
  { width: "6%", align: "right" },
  { width: "12%", align: "right" },
  { width: "13%", align: "right" },
  { width: "14%", align: "right" },
  { width: "10%", align: "right" },
  { width: "12%", align: "right" },
  { width: "13%", align: "right" },
];

function summaryValues(label: string, totals: StatementTotals) {
  return [
    label,
    String(totals.count),
    money(totals.grossCents),
    less(totals.processingCents),
    less(totals.franchiseFeeCents),
    less(totals.saasCents),
    less(totals.hardwareCents),
    money(totals.netCents),
  ];
}

function FranchiseCover({
  statements,
  summary,
  failedLocations,
}: {
  statements: DailyStatement[];
  summary: FranchiseSummary;
  failedLocations: string[];
}) {
  const first = statements[0];
  const number = `${first.number.split("-").slice(0, 2).join("-")}-ALL-${first.day.replaceAll("-", "")}`;
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Franchise Statement</Text>
        <Text style={styles.meta}>{longDate(first.day)}</Text>
        <Text style={styles.meta}>No. {number}</Text>
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Franchise</Text>
          <Text style={styles.partyName}>{first.franchise.name}</Text>
          <Text style={styles.partyLine}>
            {statements.length} {statements.length === 1 ? "location" : "locations"} on Adora Pay
          </Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.partyLabel}>Statement</Text>
          <Text style={styles.partyLine}>
            Business day: 12:00 AM to 11:59 PM {zoneName(first.timeZone, first.day)}
          </Text>
          <Text style={styles.partyLine}>Generated {stamp(first.generatedAt, first.timeZone)}</Text>
        </View>
      </View>

      <SummaryTiles totals={summary.totals} settledTo="your locations" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By location</Text>
        <View style={styles.headRow} wrap={false}>
          <Cells
            columns={SUMMARY_COLUMNS}
            values={["Location", "Pmts", "Gross", "Processing", "Franchise fee", "SaaS", "Hardware", "Net"]}
            style={styles.head}
          />
        </View>
        {summary.rows.map(({ location, totals }) => (
          <View key={location.id} style={styles.row} wrap={false}>
            <Cells columns={SUMMARY_COLUMNS} values={summaryValues(`${location.city} · ${location.id}`, totals)} />
          </View>
        ))}
        <View style={styles.totalRow} wrap={false}>
          <Cells columns={SUMMARY_COLUMNS} values={summaryValues("All locations", summary.totals)} style={styles.bold} />
        </View>
        <Text style={styles.note}>Each location&apos;s statement follows.</Text>
        {failedLocations.length > 0 && (
          <Text style={[styles.note, { color: "#b91c1c" }]}>
            Payments couldn&apos;t be loaded for: {failedLocations.join(", ")}. Those locations are left out.
          </Text>
        )}
      </View>
      <Footer left={number} />
    </Page>
  );
}

export function renderDailyStatementPdf(statement: DailyStatement) {
  return renderToBuffer(
    <Document title={`Daily Statement ${statement.number}`} author="Adora Pay" creator="Adora Pay">
      <StatementPage statement={statement} />
    </Document>,
  );
}

export function renderFranchiseStatementPdf({
  statements,
  summary,
  failedLocations,
}: {
  statements: DailyStatement[];
  summary: FranchiseSummary;
  failedLocations: string[];
}) {
  return renderToBuffer(
    <Document title={`Daily Franchise Statement ${statements[0].day}`} author="Adora Pay" creator="Adora Pay">
      <FranchiseCover statements={statements} summary={summary} failedLocations={failedLocations} />
      {statements.map((statement) => (
        <StatementPage key={statement.location.id} statement={statement} />
      ))}
    </Document>,
  );
}
