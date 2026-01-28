import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerSchema,
  CustomerFormInput,
  CustomerFormData,
} from "@/lib/schemas";
import { CUSTOMER_TYPE_LABELS, CUSTOMER_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
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
} from "@/components/ui/Dialog";
import type { Customer } from "@/types/database";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<Customer>;
  mode?: "create" | "edit";
}

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultValues,
  mode = "create",
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomerFormInput, unknown, CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      org_number: defaultValues?.org_number || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      address: defaultValues?.address || "",
      antal_lagenheter: defaultValues?.antal_lagenheter || undefined,
      customer_type: defaultValues?.customer_type || undefined,
      status: defaultValues?.status || "active",
    },
  });

  const customerType = watch(
    "customer_type",
  ) as CustomerFormInput["customer_type"];
  const status = watch("status") as CustomerFormInput["status"];

  const handleFormSubmit = (data: CustomerFormData) => {
    onSubmit(data);
    if (mode === "create") {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ny kund" : "Redigera kund"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            label="Namn"
            required
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Org.nummer"
              placeholder="XXXXXX-XXXX"
              hint="Företagets organisationsnummer"
              {...register("org_number")}
            />

            <FormField
              label="Antal lägenheter"
              type="number"
              {...register("antal_lagenheter", { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_type">Kundtyp</Label>
              <Select
                value={customerType}
                onValueChange={(value) =>
                  setValue(
                    "customer_type",
                    value as CustomerFormData["customer_type"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as CustomerFormData["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_STATUS_LABELS).map(
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

          <FormField
            label="E-post"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <FormField
            label="Telefon"
            hint="Ex: 070-123 45 67"
            {...register("phone")}
          />

          <div className="space-y-2">
            <Label htmlFor="address">Adress</Label>
            <Textarea id="address" rows={2} {...register("address")} />
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
                : mode === "create"
                  ? "Skapa kund"
                  : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
