"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import type { Option } from "../options";

export function CheckboxCardGroup<V extends string>({
  name,
  options,
  value,
  onChange,
  invalid,
}: {
  name: string;
  options: readonly Option<V>[];
  value: V[];
  onChange: (value: V[]) => void;
  invalid?: boolean;
}) {
  const toggle = ({ option, checked }: { option: V; checked: boolean }) => {
    if (checked) onChange([...value, option]);
    else onChange(value.filter((selected) => selected !== option));
  };

  return (
    <div data-slot="checkbox-group" className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <FieldLabel key={option.value} htmlFor={id}>
            <Field orientation="horizontal" data-invalid={invalid}>
              <Checkbox
                id={id}
                checked={value.includes(option.value)}
                onCheckedChange={(checked) =>
                  toggle({ option: option.value, checked })
                }
                aria-invalid={invalid}
              />
              <FieldContent>
                <FieldTitle>{option.label}</FieldTitle>
                {option.description && (
                  <FieldDescription>{option.description}</FieldDescription>
                )}
              </FieldContent>
            </Field>
          </FieldLabel>
        );
      })}
    </div>
  );
}
