import { NextResponse, type NextRequest } from "next/server";
import { clearEvents, isDevtoolsEnabled, listEvents } from "@/lib/devtools/store";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(request: NextRequest) {
  if (!isDevtoolsEnabled()) return notFound();
  const after = Number(request.nextUrl.searchParams.get("after") ?? 0);
  const feed = await listEvents(Number.isFinite(after) && after > 0 ? after : 0);
  return NextResponse.json(feed, { headers: { "cache-control": "no-store" } });
}

export async function DELETE() {
  if (!isDevtoolsEnabled()) return notFound();
  await clearEvents();
  return new NextResponse(null, { status: 204 });
}
