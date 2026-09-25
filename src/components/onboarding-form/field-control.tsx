"use client";

import { useRef, useState } from "react";
import { FileIcon, Loader2Icon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  geoTotal,
  REGION_OPTIONS,
  type FieldDefinition,
  type FieldValue,
  type FormValues,
  type GeoDistributionEntry,
} from "@/lib/onboarding-form";

export type UploadFile = (args: { field: FieldDefinition; file: File }) => Promise<string>;

type ControlProps = {
  field: FieldDefinition;
  values: FormValues;
  onChange: (name: string, value: FieldValue) => void;
  invalid: boolean;
  disabled?: boolean;
  uploadFile?: UploadFile;
};

const inputId = (name: string) => `field-${name}`;

function SelectControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const value = values[field.name];
  return (
    <Select
      items={field.options ?? []}
      value={typeof value === "string" && value ? value : null}
      onValueChange={(next) => onChange(field.name, (next as string | null) ?? undefined)}
      disabled={disabled}
    >
      <SelectTrigger id={inputId(field.name)} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiselectControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const raw = values[field.name];
  const selected = typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
  const toggle = ({ option, checked }: { option: string; checked: boolean }) => {
    const next = checked
      ? [...selected, option]
      : selected.filter((value) => value !== option);
    onChange(field.name, next.join(","));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {field.options?.map((option) => {
        const id = `${inputId(field.name)}-${option.value}`;
        return (
          <Field
            key={option.value}
            orientation="horizontal"
            className="rounded-lg border px-3 py-2.5 has-data-checked:border-primary/40 has-data-checked:bg-primary/5"
          >
            <Checkbox
              id={id}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => toggle({ option: option.value, checked })}
              disabled={disabled}
              aria-invalid={invalid}
            />
            <FieldLabel htmlFor={id} className="font-normal leading-snug">
              {option.label}
            </FieldLabel>
          </Field>
        );
      })}
    </div>
  );
}

function MoneyControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const value = values[field.name];
  const amount = value && typeof value === "object" && !Array.isArray(value) ? value.amount : undefined;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={inputId(field.name)}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="pl-6"
        placeholder={field.placeholder}
        value={amount ?? ""}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => {
          const next = event.target.value;
          onChange(
            field.name,
            next === "" ? undefined : { currency: "usd", amount: Number(next) },
          );
        }}
      />
    </div>
  );
}

function GeoDistributionControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const raw = values[field.name];
  const entries: GeoDistributionEntry[] = Array.isArray(raw) ? raw : [];
  const used = new Set(entries.map((entry) => entry.region));
  const available = REGION_OPTIONS.filter((option) => !used.has(option.value));
  const total = geoTotal(entries);
  const update = (next: GeoDistributionEntry[]) =>
    onChange(field.name, next.length ? next : undefined);

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <div key={entry.region} className="flex items-center gap-2">
          <span className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm">{entry.region}</span>
          <div className="relative w-28">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              aria-label={`${entry.region} percentage`}
              value={Number.isFinite(entry.percentage) ? entry.percentage : ""}
              disabled={disabled}
              aria-invalid={invalid}
              className="pr-7"
              onChange={(event) =>
                update(
                  entries.map((current, i) =>
                    i === index
                      ? { ...current, percentage: Number(event.target.value || 0) }
                      : current,
                  ),
                )
              }
            />
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${entry.region}`}
            disabled={disabled}
            onClick={() => update(entries.filter((_, i) => i !== index))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {available.length > 0 && !disabled && (
          <Select
            items={available}
            value={null}
            onValueChange={(region) =>
              region &&
              update([
                ...entries,
                { region: region as string, percentage: entries.length ? 0 : 100 },
              ])
            }
          >
            <SelectTrigger id={inputId(field.name)} aria-invalid={invalid}>
              <PlusIcon />
              <SelectValue placeholder="Add a region" />
            </SelectTrigger>
            <SelectContent>
              {available.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {entries.length > 0 && (
          <span
            className={`text-sm ${Math.abs(total - 100) < 0.01 ? "text-muted-foreground" : "text-destructive"}`}
          >
            Total {total}%
          </span>
        )}
      </div>
    </div>
  );
}

function parseFiles(value: FieldValue): { name: string; key: string }[] {
  if (typeof value !== "string" || !value) return [];
  return value
    .split(",")
    .filter(Boolean)
    .map((entry) => {
      const [name, key] = entry.split("|");
      return { name, key: key ?? name };
    });
}

function FileControl({ field, values, onChange, invalid, disabled, uploadFile }: ControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const files = parseFiles(values[field.name]);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length || !uploadFile) return;
    setError(undefined);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(list)) {
        if (field.maxSizeMb && file.size > field.maxSizeMb * 1024 * 1024)
          throw new Error(`${file.name} is larger than ${field.maxSizeMb}MB`);
        uploaded.push(await uploadFile({ field, file }));
      }
      const current = typeof values[field.name] === "string" ? (values[field.name] as string) : "";
      onChange(field.name, [current, ...uploaded].filter(Boolean).join(","));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <div key={file.key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <FileIcon className="size-4 text-muted-foreground" />
          <span className="flex-1 truncate">{file.name}</span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${file.name}`}
              onClick={() =>
                onChange(
                  field.name,
                  files
                    .filter((other) => other.key !== file.key)
                    .map((other) => `${other.name}|${other.key}`)
                    .join(",") || undefined,
                )
              }
            >
              <XIcon />
            </Button>
          )}
        </div>
      ))}
      <input
        ref={inputRef}
        id={inputId(field.name)}
        type="file"
        multiple
        accept={field.accept}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => onFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="self-start"
        aria-invalid={invalid}
        disabled={disabled || uploading || !uploadFile}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <UploadIcon data-icon="inline-start" />
        )}
        {uploading ? "Uploading…" : files.length ? "Add another file" : "Upload file"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {field.accept?.replaceAll(",", ", ")}
        {field.maxSizeMb ? ` · up to ${field.maxSizeMb}MB each` : ""}
      </span>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function TelControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const codeField = field.countryCodeField;
  const code = codeField ? values[codeField] : undefined;
  const value = values[field.name];
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      {codeField && (
        <Input
          aria-label="Country code"
          inputMode="tel"
          placeholder="+1"
          value={typeof code === "string" ? code : ""}
          disabled={disabled}
          onChange={(event) => onChange(codeField, event.target.value || undefined)}
        />
      )}
      <Input
        id={inputId(field.name)}
        type="tel"
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </div>
  );
}

function EmailControl({ field, values, onChange, invalid, disabled }: ControlProps) {
  const value = values[field.name];
  const source = field.sameAsField ? values[field.sameAsField.field] : undefined;
  const [sameAs, setSameAs] = useState(
    () => !!field.sameAsField && typeof value === "string" && !!value && value === source,
  );
  const shown = sameAs ? source : value;

  return (
    <div className="flex flex-col gap-2">
      {field.sameAsField && (
        <Field orientation="horizontal">
          <Checkbox
            id={`${inputId(field.name)}-same`}
            checked={sameAs}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setSameAs(checked);
              if (checked) onChange(field.name, typeof source === "string" ? source : undefined);
            }}
          />
          <FieldLabel htmlFor={`${inputId(field.name)}-same`} className="font-normal">
            {field.sameAsField.label}
          </FieldLabel>
        </Field>
      )}
      <Input
        id={inputId(field.name)}
        type="email"
        placeholder={field.placeholder}
        value={typeof shown === "string" ? shown : ""}
        disabled={disabled || sameAs}
        aria-invalid={invalid}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </div>
  );
}

export function FieldControl(props: ControlProps) {
  const { field, values, onChange, invalid, disabled } = props;
  const value = values[field.name];
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "select":
      return <SelectControl {...props} />;
    case "multiselect":
      return <MultiselectControl {...props} />;
    case "money-amount":
      return <MoneyControl {...props} />;
    case "geo-distribution":
      return <GeoDistributionControl {...props} />;
    case "file":
      return <FileControl {...props} />;
    case "tel":
      return <TelControl {...props} />;
    case "email":
      return <EmailControl {...props} />;
    case "textarea":
      return (
        <Textarea
          id={inputId(field.name)}
          placeholder={field.placeholder}
          value={text}
          disabled={disabled}
          aria-invalid={invalid}
          rows={4}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      );
    default:
      return (
        <Input
          id={inputId(field.name)}
          type={field.type === "date" ? "date" : "text"}
          inputMode={field.type === "url" ? "url" : undefined}
          placeholder={field.placeholder}
          value={text}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      );
  }
}
