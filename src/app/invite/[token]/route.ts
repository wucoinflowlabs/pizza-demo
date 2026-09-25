import { NextResponse, type NextRequest } from "next/server";
import { readInviteToken } from "@/lib/invites";
import { setCurrentAccountId } from "@/lib/session";

export async function GET(request: NextRequest, { params }: RouteContext<"/invite/[token]">) {
  const { token } = await params;
  const accountId = readInviteToken(token);
  if (!accountId) return NextResponse.redirect(new URL("/apply?invite=invalid", request.url));

  await setCurrentAccountId(accountId);
  return NextResponse.redirect(new URL("/apply", request.url));
}
