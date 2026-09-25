import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationSummary } from "../actions";
import { InviteActions } from "./invite-actions";
import { ApplicationBadge, FormBadge, PayoutBadge, VerificationBadge } from "./status-badges";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ApplicationsTable({ applications }: { applications: ApplicationSummary[] }) {
  if (!applications.length)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">No businesses yet.</p>
          <Link href="/operator/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            Onboard a business
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead className="hidden sm:table-cell">Details</TableHead>
            <TableHead>Application</TableHead>
            <TableHead className="hidden lg:table-cell">Payouts</TableHead>
            <TableHead className="text-right">Invite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.merchantId}>
              <TableCell>
                <div className="font-medium">{application.merchantId}</div>
                <div className="text-xs text-muted-foreground">{application.email}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {application.createdAt ? dateFormat.format(new Date(application.createdAt)) : "—"}
              </TableCell>
              <TableCell>
                <VerificationBadge status={application.verificationStatus} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <FormBadge submitted={application.onboardingFormSubmitted} />
              </TableCell>
              <TableCell>
                <ApplicationBadge
                  submitted={application.applicationSubmitted}
                  approved={application.approved}
                />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <PayoutBadge status={application.payouts} />
              </TableCell>
              <TableCell>
                <InviteActions merchantId={application.merchantId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
