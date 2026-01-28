import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCustomers } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
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
import type { Contact } from "@/types/database";

const CONTACT_TYPE_LABELS = {
  customer: "Kundkontakt",
  assignment: "Uppdragskontakt",
  standalone: "Fristående",
};

const contactSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  role: z.string().optional(),
  email: z.string().email("Ogiltig e-postadress").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  customer_id: z.string().optional(),
  contact_type: z
    .enum(["customer", "assignment", "standalone"])
    .default("standalone"),
  is_invoice_recipient: z.boolean().default(false),
});

type ContactFormInput = z.input<typeof contactSchema>;
type ContactFormData = z.output<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContactFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<Contact>;
  mode?: "create" | "edit";
  preselectedCustomerId?: string;
}

export function ContactForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultValues,
  mode = "create",
  preselectedCustomerId,
}: ContactFormProps) {
  const { data: customers } = useCustomers();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormInput, unknown, ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const customerId = watch("customer_id");
  const contactType = watch("contact_type");
  const isInvoiceRecipient = watch("is_invoice_recipient");

  useEffect(() => {
    if (open) {
      reset({
        name: defaultValues?.name || "",
        role: defaultValues?.role || "",
        email: defaultValues?.email || "",
        phone: defaultValues?.phone || "",
        address: defaultValues?.address || "",
        notes: defaultValues?.notes || "",
        customer_id:
          defaultValues?.customer_id || preselectedCustomerId || undefined,
        contact_type:
          defaultValues?.contact_type ||
          (preselectedCustomerId ? "customer" : "standalone"),
        is_invoice_recipient: defaultValues?.is_invoice_recipient || false,
      });
    }
  }, [open, defaultValues, preselectedCustomerId, reset]);

  const handleFormSubmit = (data: ContactFormData) => {
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
            {mode === "create" ? "Ny kontakt" : "Redigera kontakt"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" error={!!errors.name}>
              Namn *
            </Label>
            <Input id="name" error={!!errors.name} {...register("name")} />
            {errors.name && (
              <p className="text-sm text-terracotta">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Roll/Titel</Label>
              <Input
                id="role"
                placeholder="t.ex. Ordförande"
                {...register("role")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_type">Kontakttyp</Label>
              <Select
                value={contactType}
                onValueChange={(value) =>
                  setValue(
                    "contact_type",
                    value as ContactFormData["contact_type"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(contactType === "customer" || contactType === "assignment") && (
            <div className="space-y-2">
              <Label htmlFor="customer_id">Kund</Label>
              <Select
                value={customerId || ""}
                onValueChange={(value) =>
                  setValue("customer_id", value || undefined)
                }
                disabled={!!preselectedCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kund" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customer_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" error={!!errors.email}>
                E-post
              </Label>
              <Input
                id="email"
                type="email"
                error={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-terracotta">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adress</Label>
            <Input id="address" {...register("address")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex items-center justify-between p-3 bg-sand rounded-lg">
            <div>
              <Label htmlFor="is_invoice_recipient" className="font-medium">
                Fakturamottagare
              </Label>
              <p className="text-xs text-ash">
                Kontakten tar emot fakturor för kunden
              </p>
            </div>
            <Switch
              checked={isInvoiceRecipient}
              onCheckedChange={(checked) =>
                setValue("is_invoice_recipient", checked)
              }
            />
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
                  ? "Skapa kontakt"
                  : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
