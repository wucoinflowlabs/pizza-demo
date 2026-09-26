import { Card } from "@/components/ui/card";
import type { StoreOnboardingStatus } from "../store-status";

const STAGES = [
  {
    id: "not-started",
    label: "Not started",
    fill: "fill-muted-foreground/25",
    swatch: "bg-muted-foreground/25",
  },
  { id: "account", label: "Account creation", fill: "fill-adora-sky", swatch: "bg-adora-sky" },
  { id: "form", label: "Form submitted", fill: "fill-adora-blue", swatch: "bg-adora-blue" },
  { id: "approved", label: "Approved", fill: "fill-adora-navy", swatch: "bg-adora-navy" },
] as const;

type StageId = (typeof STAGES)[number]["id"];

function stageOf(status: StoreOnboardingStatus): StageId {
  if (status === "not-started") return "not-started";
  if (status === "approved") return "approved";
  if (status === "form-submitted" || status === "under-review") return "form";
  return "account";
}

function point(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 16 + radius * Math.cos(radians),
    y: 16 + radius * Math.sin(radians),
  };
}

function slicePath(start: number, end: number) {
  const sweep = end - start;
  if (sweep >= 359.999) {
    return "M 16 2 A 14 14 0 1 1 15.999 2 Z";
  }
  const from = point(start, 14);
  const to = point(end, 14);
  const large = sweep > 180 ? 1 : 0;
  return `M 16 16 L ${from.x} ${from.y} A 14 14 0 ${large} 1 ${to.x} ${to.y} Z`;
}

export function OnboardingChart({
  stores,
}: {
  stores: { status: StoreOnboardingStatus }[];
}) {
  const counts = new Map<StageId, number>(STAGES.map((stage) => [stage.id, 0]));
  for (const store of stores) {
    const stage = stageOf(store.status);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  const total = stores.length;
  const slices = STAGES.map((stage) => ({
    ...stage,
    count: counts.get(stage.id) ?? 0,
  })).filter((stage) => stage.count > 0);

  let cursor = 0;
  const paths = slices.map((slice) => {
    const start = cursor;
    const sweep = total === 0 ? 0 : (slice.count / total) * 360;
    cursor += sweep;
    return { ...slice, d: slicePath(start, start + sweep) };
  });

  const summary =
    total === 0
      ? "No stores"
      : slices.map((slice) => `${slice.label}: ${slice.count}`).join(", ");

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-8">
      <svg
        viewBox="0 0 32 32"
        role="img"
        aria-label={`Store onboarding. ${summary}.`}
        className="size-36 shrink-0"
      >
        {total === 0 ? (
          <circle cx="16" cy="16" r="14" className="fill-muted" />
        ) : (
          paths.map((slice) => <path key={slice.id} d={slice.d} className={slice.fill} />)
        )}
      </svg>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-base font-medium">Store onboarding</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {total} {total === 1 ? "store" : "stores"} across the customers shown below.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {STAGES.map((stage) => {
            const count = counts.get(stage.id) ?? 0;
            const percent = total === 0 ? 0 : Math.round((count / total) * 100);
            return (
              <li key={stage.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${stage.swatch}`} />
                <span className="min-w-0 flex-1">{stage.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count} · {percent}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
