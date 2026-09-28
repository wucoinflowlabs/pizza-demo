import { Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function UnderReviewScreen() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="font-heading text-2xl font-semibold">Pending</p>
      </CardContent>
    </Card>
  );
}
