"use client";

import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface Props {
  fields: any[];
  values: Record<string, any>;
  setValues: (key: string, value: any) => void;
  loading: boolean;
}

export function AdditionalInformation({
  fields,
  values,
  setValues,
  loading,
}: Props) {
  if (loading) return <p>Loading additional fields...</p>;

  if (!fields.length) {
    return <p>No additional information required.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-normal text-muted-foreground">Additional Information</h2>
      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => {
            const key = `field_${field.id}`;
            const isRequired = field.required === "on";

            // TEXT FIELD
            if (field.fieldtype === "text") {
              return (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.fieldname}
                    {isRequired && <span className="text-red-500"> *</span>}
                  </Label>

                  <Input
                    value={values[key] || ""}
                    onChange={(e) => setValues(key, e.target.value)}
                  />

                  {field.description && (
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  )}
                </div>
              );
            }

            // DROPDOWN FIELD
            if (field.fieldtype === "dropdown") {
              const options = field.fieldoptions
                .split(",")
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt !== "");

              return (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.fieldname}
                    {isRequired && <span className="text-red-500"> *</span>}
                  </Label>

                  <Select
                    value={values[key] || undefined}
                    onValueChange={(v) => setValues(key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>

                    <SelectContent>
                      {options.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {field.description && (
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}