import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  journalSchema,
  JournalFormInput,
  JournalFormData,
} from "@/lib/schemas";
import { ENTRY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import type { JournalEntryWithAuthor } from "@/types/database";

interface JournalEditDialogProps {
  entry: JournalEntryWithAuthor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: JournalFormData) => void;
  isLoading?: boolean;
  hasTimebank?: boolean;
  remainingHours?: number;
}

export function JournalEditDialog({
  entry,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  hasTimebank = false,
  remainingHours = 0,
}: JournalEditDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<JournalFormInput, unknown, JournalFormData>({
    resolver: zodResolver(journalSchema),
  });

  const entryType = watch("entry_type");
  const hours = watch("hours");
  const isExtraBillable = watch("is_extra_billable");

  // Synka formulär med befintlig entry när dialogen öppnas
  useEffect(() => {
    if (open && entry) {
      reset({
        content: entry.content || "",
        hours: entry.hours || undefined,
        billing_comment: entry.billing_comment || "",
        is_extra_billable: entry.is_extra_billable || false,
        entry_type: entry.entry_type || "note",
      });
    }
  }, [open, entry, reset]);

  const handleFormSubmit = (data: JournalFormData) => {
    onSubmit(data);
  };

  const willExceedTimebank =
    hasTimebank && hours && hours > remainingHours && !isExtraBillable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera journalpost</DialogTitle>
          <DialogDescription>
            Uppdatera innehåll och tid för journalposten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_type">Typ av aktivitet</Label>
              <Select
                value={entryType}
                onValueChange={(value) =>
                  setValue("entry_type", value as JournalFormData["entry_type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Tid (timmar)</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                placeholder="0.00"
                {...register("hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" error={!!errors.content}>
              Innehåll *
            </Label>
            <Textarea
              id="content"
              rows={4}
              placeholder="Beskriv vad som gjordes..."
              error={!!errors.content}
              {...register("content")}
            />
            {errors.content && (
              <p className="text-sm text-terracotta">
                {errors.content.message}
              </p>
            )}
          </div>

          {hours && hours > 0 && (
            <div className="space-y-2">
              <Label htmlFor="billing_comment">
                Fakturatext (visas på faktura)
              </Label>
              <Input
                id="billing_comment"
                placeholder="Valfri text för fakturan..."
                {...register("billing_comment")}
              />
            </div>
          )}

          {hasTimebank && hours && hours > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_extra_billable"
                  checked={isExtraBillable || false}
                  onCheckedChange={(checked) =>
                    setValue("is_extra_billable", !!checked)
                  }
                />
                <Label
                  htmlFor="is_extra_billable"
                  className="font-normal cursor-pointer"
                >
                  Markera som extraarbete (utanför timbanken)
                </Label>
              </div>

              {willExceedTimebank && (
                <p className="text-sm text-terracotta bg-terracotta/10 p-2 rounded">
                  ⚠️ Dessa timmar ({hours} tim) överskrider kvarvarande timbank
                  ({remainingHours} tim).
                  {hours - remainingHours} tim kommer debiteras som övertid.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sparar..." : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
