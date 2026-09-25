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
import { ApplicationBadge, PayoutBadge } from "./status-badges";

export function ApplicationsTable({ applications }: { applications: ApplicationSummary[] }) {
  if (!applications.length)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">
            No applications yet. Enable payment processing for a customer above to start one.
          </p>
        </CardContent>
      </Card>
    );

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Application</TableHead>
            <TableHead className="hidden sm:table-cell">Payouts</TableHead>
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
              <TableCell>
                <ApplicationBadge
                  submitted={application.applicationSubmitted}
                  approved={application.approved}
                />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
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
