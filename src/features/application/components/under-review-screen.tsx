import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UnderReviewScreen() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="font-heading text-2xl font-semibold">Pending</p>
        </CardContent>
      </Card>
      <Button type="button" variant="outline" size="lg" className="self-start">
        Onboard another shop
      </Button>
    </div>
  );
}
