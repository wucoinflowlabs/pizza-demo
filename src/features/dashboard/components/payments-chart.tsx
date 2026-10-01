"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { cn } from "cn";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PAYMENT_METHODS, type PaymentMethodKey, type PaymentsSeries } from "../payments-series";

type Measure = "amount" | "count";

/**
 * Each method keeps its color whatever else is on screen. Hues follow the
 * dataviz categorical order and were checked with its palette validator.
 */
const METHOD_COLORS: Record<PaymentMethodKey, { light: string; dark: string }> = {
  card: { light: "#2a78d6", dark: "#3987e5" },
  ach: { light: "#eb6834", dark: "#d95926" },
  crypto: { light: "#1baf7a", dark: "#199e70" },
  venmo: { light: "#eda100", dark: "#c98500" },
  other: { light: "#e87ba4", dark: "#d55181" },
  cashapp: { light: "#008300", dark: "#008300" },
  paypal: { light: "#4a3aa7", dark: "#9085e9" },
};

const CHART_CONFIG = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [
    method.key,
    { label: method.label, theme: METHOD_COLORS[method.key] },
  ]),
) satisfies ChartConfig;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatValue(measure: Measure, value: number) {
  return measure === "amount" ? usd.format(value) : value.toLocaleString();
}

function formatRange(from: string, to: string) {
  const day = (date: string, withYear: boolean) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${day(from, false)} – ${day(to, true)}`;
}

function PaymentsCard({
  subtitle,
  total,
  action,
  children,
}: {
  subtitle: string;
  total?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-shop-ink">Payments</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
        {total !== undefined && (
          <CardAction className="font-heading text-2xl font-semibold text-shop-ink sm:text-3xl">
            {total}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {action}
        {children}
      </CardContent>
    </Card>
  );
}

function MeasureToggle({ value, onChange }: { value: Measure; onChange: (next: Measure) => void }) {
  return (
    <div
      role="group"
      aria-label="Chart measure"
      className="inline-flex w-fit rounded-lg bg-muted p-1 ring-1 ring-foreground/5"
    >
      {(["amount", "count"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm capitalize transition-colors",
            value === option
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function PaymentsChart({ series, error }: { series?: PaymentsSeries; error?: string }) {
  const [measure, setMeasure] = useState<Measure>("amount");

  if (!series) {
    return (
      <PaymentsCard subtitle="Settled payments by method">
        <p className="py-10 text-center text-sm text-muted-foreground">
          {error ?? "Payments couldn't be loaded right now."}
        </p>
      </PaymentsCard>
    );
  }

  const subtitle = `Settled payments by method · ${formatRange(series.from, series.to)}`;
  const total =
    measure === "amount"
      ? usd.format(series.totalCents / 100)
      : `${series.totalCount.toLocaleString()} ${series.totalCount === 1 ? "payment" : "payments"}`;

  if (series.methods.length === 0) {
    return (
      <PaymentsCard subtitle={subtitle} total={usd.format(0)}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          No settled payments in the last 7 days.
        </p>
      </PaymentsCard>
    );
  }

  const valueOf = (day: PaymentsSeries["days"][number], key: PaymentMethodKey) =>
    measure === "amount" ? (day.cents[key] ?? 0) / 100 : (day.counts[key] ?? 0);
  const rows = series.days.map((day) => ({
    date: day.date,
    ...Object.fromEntries(series.methods.map((key) => [key, valueOf(day, key)])),
  }));

  return (
    <PaymentsCard
      subtitle={subtitle}
      total={total}
      action={<MeasureToggle value={measure} onChange={setMeasure} />}
    >
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-72 w-full">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={56}
            allowDecimals={measure === "amount"}
            tickFormatter={(value: number) =>
              measure === "amount" ? usdCompact.format(value) : value.toLocaleString()
            }
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 text-muted-foreground">
                      {CHART_CONFIG[name as PaymentMethodKey]?.label ?? name}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatValue(measure, Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          {/* Keep the series order instead of Recharts' default alphabetical sort. */}
          <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
          {series.methods.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </PaymentsCard>
  );
}
