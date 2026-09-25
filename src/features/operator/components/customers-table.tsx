import Link from "next/link";
import { CreditCardIcon, MapPinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdoraCustomer } from "../adora-customers";

export function CustomersTable({ customers }: { customers: AdoraCustomer[] }) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead className="hidden sm:table-cell">Location</TableHead>
            <TableHead className="hidden md:table-cell">Adora products</TableHead>
            <TableHead className="text-right">Payments</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map(({ id, name, location, products }) => (
            <TableRow key={id}>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5 text-muted-foreground" />
                  {location.city}, {location.state}
                </div>
                <div className="text-xs text-muted-foreground">{location.stores} stores</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {products.map((product) => (
                    <Badge key={product} variant="secondary">
                      {product}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/operator/new?customer=${id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  <CreditCardIcon data-icon="inline-start" />
                  Enable Payment Processing
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
