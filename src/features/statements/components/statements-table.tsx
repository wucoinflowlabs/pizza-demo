import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FailedLocations, LocationPicker, type LocationOption } from "@/features/dashboard/components/table-controls";
import { formatBps, type FeeSchedule } from "../fee-schedule";
import type { StatementDay } from "../load-statements";

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function less(cents: number) {
  return cents === 0 ? "—" : `-${money(cents)}`;
}

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function statementHref(day: string, location: string, inline = false) {
  const params = new URLSearchParams({ date: day, location });
  if (inline) params.set("inline", "1");
  return `/api/statements/daily?${params.toString()}`;
}

export function StatementsTable({
  days,
  today,
  locations,
  location,
  schedule,
  failedLocations = [],
  error,
}: {
  days?: StatementDay[];
  today: string;
  locations: LocationOption[];
  /** The picked store, or undefined for all locations. */
  location?: string;
  schedule: FeeSchedule;
  failedLocations?: string[];
  error?: string;
}) {
  const target = location ?? "all";
  const net = days?.reduce((sum, row) => sum + row.totals.netCents, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Daily statements</CardTitle>
        <CardDescription>
          Every settled payment, with Adora&apos;s SaaS fee ({formatBps(schedule.saasBps)}) and processing, the
          hardware program ({money(schedule.hardwareDailyCents)}/day per location) and your royalty (
          {formatBps(schedule.royaltyBps)}) netted out. Business days run midnight to midnight Pacific.
        </CardDescription>
        {net !== undefined && (
          <CardAction className="text-right">
            <p className="font-heading text-2xl font-semibold text-shop-ink sm:text-3xl">{money(net)}</p>
            <p className="text-xs text-muted-foreground">Net deposits, last {days?.length} days</p>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <LocationPicker locations={locations} value={location} />
          <form action="/api/statements/daily" method="get" className="flex items-center gap-2">
            <input type="hidden" name="location" value={target} />
            <Input
              type="date"
              name="date"
              required
              max={today}
              defaultValue={today}
              aria-label="Statement date"
              className="h-10 w-40 bg-background"
            />
            <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
              <DownloadIcon />
              Download PDF
            </button>
          </form>
        </div>
        <FailedLocations names={failedLocations} />
        {error ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="-mx-4 border-t border-foreground/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Business day</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Gross sales</TableHead>
                  <TableHead className="text-right">Adora SaaS + processing</TableHead>
                  <TableHead className="text-right">Hardware</TableHead>
                  <TableHead className="text-right">Royalty</TableHead>
                  <TableHead className="text-right">Net deposit</TableHead>
                  <TableHead className="pr-6">
                    <span className="sr-only">Statement</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days?.map(({ day, totals }) => (
                  <TableRow key={day}>
                    <TableCell className="py-4 pl-6 font-medium text-shop-ink">
                      {dayLabel(day)}
                      {day === today && <span className="ml-2 text-xs font-normal text-muted-foreground">Open</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground/80">{totals.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(totals.grossCents)}</TableCell>
                    {/* Both are netted by Adora as the parent merchant before the location settles. */}
                    <TableCell className="text-right tabular-nums text-foreground/70">
                      {less(totals.saasCents + totals.processingCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground/70">{less(totals.hardwareCents)}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground/70">{less(totals.royaltyCents)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        totals.netCents < 0 ? "text-destructive" : "text-shop-ink",
                      )}
                    >
                      {money(totals.netCents)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1">
                        <a
                          href={statementHref(day, target, true)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View statement for ${dayLabel(day)}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          <ExternalLinkIcon />
                          View
                        </a>
                        <a
                          href={statementHref(day, target)}
                          download
                          aria-label={`Download statement for ${dayLabel(day)}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <DownloadIcon />
                          PDF
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
