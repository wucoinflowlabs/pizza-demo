import { NextResponse, type NextRequest } from "next/server";
import { enrolledLocations, getSessionFranchise, parseLocation } from "@/features/dashboard/franchise";
import { dayIn } from "@/features/dashboard/withdraw-range";
import { STATEMENT_TIME_ZONE, loadDailyStatements } from "@/features/statements/load-statements";
import { renderDailyStatementPdf, renderFranchiseStatementPdf } from "@/features/statements/pdf/statement-document";
import { buildFranchiseSummary } from "@/features/statements/statement";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A franchise owner's daily statement as a PDF: `?date=YYYY-MM-DD&location=<store id>`
 * for one restaurant, or `location=all` for every enrolled location behind a summary page.
 */
export async function GET(request: NextRequest) {
  const franchise = await getSessionFranchise();
  if (!franchise) return NextResponse.json({ error: "Statements are for franchise owners" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const day = params.get("date") ?? "";
  if (!ISO_DAY.test(day) || Number.isNaN(Date.parse(day)) || day > dayIn(STATEMENT_TIME_ZONE, new Date())) {
    return NextResponse.json({ error: "Pick a business day up to today." }, { status: 400 });
  }

  const all = params.get("location") === "all";
  const selected = all ? undefined : parseLocation(params.get("location"), franchise.locations);
  if (!all && !selected) return NextResponse.json({ error: "Unknown location" }, { status: 404 });
  const locations = selected ? [selected] : enrolledLocations(franchise.locations);
  if (locations.length === 0) return NextResponse.json({ error: "No locations are on Adora Pay yet" }, { status: 404 });

  const result = await loadDailyStatements({ franchise, locations, day });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 502 });
  const { statements, failedLocations } = result;

  let pdf: Buffer;
  try {
    pdf = all
      ? await renderFranchiseStatementPdf({ statements, summary: buildFranchiseSummary(statements), failedLocations })
      : await renderDailyStatementPdf(statements[0]);
  } catch (err) {
    console.error("[statements] PDF could not be rendered", err);
    return NextResponse.json({ error: "The statement couldn't be generated." }, { status: 500 });
  }
  const filename = all
    ? `ADORA-${franchise.customer.id}-ALL-${day.replaceAll("-", "")}`.toUpperCase()
    : statements[0].number;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${params.get("inline") ? "inline" : "attachment"}; filename="${filename}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
