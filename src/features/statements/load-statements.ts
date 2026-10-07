import "server-only";
import type { EnrolledLocation, SessionFranchise } from "@/features/dashboard/franchise";
import { DEFAULT_TIME_ZONE } from "@/features/dashboard/load-payments-series";
import { dayIn, rangeBounds } from "@/features/dashboard/withdraw-range";
import { PaymentsError } from "@/lib/payments/errors";
import { listMerchantPayments } from "@/lib/payments/payments";
import type { CoinflowPayment } from "@/lib/payments/types";
import { STATEMENT_CHARGES, feeScheduleFor } from "./fee-schedule";
import {
  buildDailyStatement,
  buildFranchiseSummary,
  type DailyStatement,
  type StatementLocation,
  type StatementTotals,
} from "./statement";

const DAY_MS = 24 * 60 * 60 * 1000;

export const STATEMENT_TIME_ZONE = DEFAULT_TIME_ZONE;

/** One row of the statements tracker: a business day across the chosen locations. */
export type StatementDay = { day: string; totals: StatementTotals };

type Failure = { ok: false; message: string };

function toStatementLocation(location: EnrolledLocation): StatementLocation {
  const { id, label, city, state, submerchantId } = location;
  return { id, label, city, state, submerchantId };
}

function failureOf(err: unknown): Failure {
  console.error("[statements] payments could not be loaded", err);
  return {
    ok: false,
    message: err instanceof PaymentsError ? err.userMessage : "Statements couldn't be loaded right now.",
  };
}

/**
 * Every payment for each location between two business days. Coinflow has no
 * nested sub-merchants, so each location is its own request. One store
 * failing leaves the others; all of them failing is an error.
 */
async function paymentsByLocation(locations: EnrolledLocation[], from: string, to: string) {
  const range = rangeBounds({ from, to }, STATEMENT_TIME_ZONE);
  const results = await Promise.allSettled(
    locations.map((location) => listMerchantPayments(location.submerchantId, range)),
  );
  const failures = results.flatMap((result, index) => (result.status === "rejected" ? [index] : []));
  if (locations.length > 0 && failures.length === locations.length) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  for (const index of failures) {
    console.error(
      `[statements] payments for ${locations[index].submerchantId} could not be loaded`,
      (results[index] as PromiseRejectedResult).reason,
    );
  }
  return {
    loaded: results.flatMap((result, index) =>
      result.status === "fulfilled" ? [{ location: locations[index], payments: result.value }] : [],
    ),
    failedLocations: failures.map((index) => locations[index].label),
  };
}

function statementsFor({
  franchise,
  loaded,
  day,
  now,
}: {
  franchise: SessionFranchise;
  loaded: { location: EnrolledLocation; payments: CoinflowPayment[] }[];
  day: string;
  now: Date;
}): DailyStatement[] {
  const schedule = feeScheduleFor(franchise.customer.id);
  return loaded.map(({ location, payments }) =>
    buildDailyStatement({
      payments,
      schedule,
      charges: STATEMENT_CHARGES,
      franchise: { id: franchise.customer.id, name: franchise.customer.name },
      location: toStatementLocation(location),
      day,
      timeZone: STATEMENT_TIME_ZONE,
      now,
    }),
  );
}

/** The last `days` business days, newest first, summed across `locations`. Today is included and still open. */
export async function loadStatementDays({
  franchise,
  locations,
  days,
}: {
  franchise: SessionFranchise;
  locations: EnrolledLocation[];
  days: number;
}): Promise<{ ok: true; days: StatementDay[]; failedLocations: string[]; today: string } | Failure> {
  try {
    const now = new Date();
    const dayList = Array.from({ length: days }, (_, index) =>
      dayIn(STATEMENT_TIME_ZONE, new Date(now.getTime() - index * DAY_MS)),
    );
    const { loaded, failedLocations } = await paymentsByLocation(locations, dayList[dayList.length - 1], dayList[0]);
    return {
      ok: true,
      today: dayList[0],
      failedLocations,
      days: dayList.map((day) => ({
        day,
        totals: buildFranchiseSummary(statementsFor({ franchise, loaded, day, now })).totals,
      })),
    };
  } catch (err) {
    return failureOf(err);
  }
}

/** One statement per location for a single business day. */
export async function loadDailyStatements({
  franchise,
  locations,
  day,
}: {
  franchise: SessionFranchise;
  locations: EnrolledLocation[];
  day: string;
}): Promise<{ ok: true; statements: DailyStatement[]; failedLocations: string[] } | Failure> {
  try {
    const { loaded, failedLocations } = await paymentsByLocation(locations, day, day);
    return { ok: true, statements: statementsFor({ franchise, loaded, day, now: new Date() }), failedLocations };
  } catch (err) {
    return failureOf(err);
  }
}
