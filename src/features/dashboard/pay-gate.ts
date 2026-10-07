import "server-only";
import { redirect } from "next/navigation";
import { getSubmerchantProgress } from "@/lib/payments/verification";
import { getSessionFranchise } from "./franchise";
import { isAdoraPayEnrolled } from "./pay-status";
import { getSessionSubmerchant } from "./session-submerchant";

/** Where an unfinished shop lands: the payments page, with the enroll carousel. */
export const PAYMENTS_PATH = "/dashboard/adora-pay/payments";

/**
 * A store that has not finished Adora Pay can only sit on the payments page.
 * Franchise owners keep the rest of the dashboard; each location enrolls on its own.
 */
export async function redirectUnlessAdoraPayReady() {
  if (await getSessionFranchise()) return;
  const session = await getSessionSubmerchant();
  if (!session) return;
  if (!session.submerchantId) redirect(PAYMENTS_PATH);
  const progress = await getSubmerchantProgress(session.submerchantId);
  if (!isAdoraPayEnrolled(progress)) redirect(PAYMENTS_PATH);
}
