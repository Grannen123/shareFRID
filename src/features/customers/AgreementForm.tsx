import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  agreementSchema,
  AgreementFormInput,
  AgreementFormData,
} from "@/lib/schemas";
import { useCreateAgreement, useUpdateAgreement } from "@/hooks/useAgreements";
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_PERIOD_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
import type { Agreement } from "@/types/database";

interface AgreementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  existingAgreement?: Agreement;
}

export function AgreementForm({
  open,
  onOpenChange,
  customerId,
  existingAgreement,
}: AgreementFormProps) {
  const createAgreement = useCreateAgreement();
  const updateAgreement = useUpdateAgreement();
  const isEdit = !!existingAgreement;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AgreementFormInput, unknown, AgreementFormData>({
    resolver: zodResolver(agreementSchema),
  });

  const agreementType = watch("type");
  const billingAdvance = watch("billing_advance");

  useEffect(() => {
    if (open) {
      reset({
        customer_id: customerId,
        type: existingAgreement?.type || "hourly",
        hourly_rate: existingAgreement?.hourly_rate || 850,
        overtime_rate: existingAgreement?.overtime_rate || undefined,
        included_hours: existingAgreement?.included_hours || undefined,
        period: existingAgreement?.period || undefined,
        billing_advance: existingAgreement?.billing_advance || false,
        fixed_amount: existingAgreement?.fixed_amount || undefined,
        billing_month: existingAgreement?.billing_month || undefined,
        valid_from:
          existingAgreement?.valid_from ||
          new Date().toISOString().split("T")[0],
        valid_to: existingAgreement?.valid_to || undefined,
        next_indexation: existingAgreement?.next_indexation || undefined,
      });
    }
  }, [open, existingAgreement, customerId, reset]);

  const onSubmit = async (data: AgreementFormData) => {
    if (isEdit && existingAgreement) {
      await updateAgreement.mutateAsync({ id: existingAgreement.id, ...data });
    } else {
      await createAgreement.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isLoading = createAgreement.isPending || updateAgreement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Redigera avtal" : "Skapa nytt avtal"}
          </DialogTitle>
          <DialogDescription>
            Konfigurera avtalsvillkor för kunden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("customer_id")} />

          <div className="space-y-2">
            <Label htmlFor="type">Avtalstyp *</Label>
            <Select
              value={agreementType}
              onValueChange={(value) =>
                setValue("type", value as AgreementFormData["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj avtalstyp" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGREEMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate" error={!!errors.hourly_rate}>
              Timpris (kr) *
            </Label>
            <Input
              id="hourly_rate"
              type="number"
              error={!!errors.hourly_rate}
              {...register("hourly_rate", { valueAsNumber: true })}
            />
            {errors.hourly_rate && (
              <p className="text-sm text-terracotta">
                {errors.hourly_rate.message}
              </p>
            )}
          </div>

          {/* Timbank-specifika fält */}
          {agreementType === "timebank" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="included_hours">Inkluderade timmar *</Label>
                  <Input
                    id="included_hours"
                    type="number"
                    {...register("included_hours", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Select
                    value={watch("period") || ""}
                    onValueChange={(value) =>
                      setValue("period", value as "monthly" | "yearly")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj period" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGREEMENT_PERIOD_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtime_rate">Övertidspris (kr) *</Label>
                <Input
                  id="overtime_rate"
                  type="number"
                  {...register("overtime_rate", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          {/* Fastpris-specifika fält */}
          {agreementType === "fixed" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixed_amount">Fast belopp (kr) *</Label>
                  <Input
                    id="fixed_amount"
                    type="number"
                    {...register("fixed_amount", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Select
                    value={watch("period") || ""}
                    onValueChange={(value) =>
                      setValue("period", value as "monthly" | "yearly")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj period" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGREEMENT_PERIOD_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_month">Faktureringsmånad (1-12)</Label>
                <Input
                  id="billing_month"
                  type="number"
                  min={1}
                  max={12}
                  {...register("billing_month", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Giltigt från *</Label>
              <Input id="valid_from" type="date" {...register("valid_from")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_to">Giltigt till</Label>
              <Input id="valid_to" type="date" {...register("valid_to")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_indexation">Nästa indexering</Label>
            <Input
              id="next_indexation"
              type="date"
              {...register("next_indexation")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billing_advance"
              checked={billingAdvance || false}
              onCheckedChange={(checked) =>
                setValue("billing_advance", !!checked)
              }
            />
            <Label
              htmlFor="billing_advance"
              className="font-normal cursor-pointer"
            >
              Fakturera i förskott
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Sparar..."
                : isEdit
                  ? "Spara ändringar"
                  : "Skapa avtal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
