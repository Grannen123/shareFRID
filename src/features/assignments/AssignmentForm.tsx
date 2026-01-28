import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  assignmentSchema,
  AssignmentFormInput,
  AssignmentFormData,
} from "@/lib/schemas";
import { useCustomers } from "@/hooks/useCustomers";
import {
  ASSIGNMENT_TYPE_LABELS,
  ASSIGNMENT_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import type { Assignment } from "@/types/database";

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AssignmentFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<Assignment>;
  mode?: "create" | "edit";
  preselectedCustomerId?: string;
}

export function AssignmentForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultValues,
  mode = "create",
  preselectedCustomerId,
}: AssignmentFormProps) {
  const { data: customers } = useCustomers();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormInput, unknown, AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
  });

  const customerId = watch("customer_id");
  const assignmentType = watch("type");
  const category = watch("category");
  const priority = watch("priority");

  useEffect(() => {
    if (open) {
      reset({
        customer_id: defaultValues?.customer_id || preselectedCustomerId || "",
        title: defaultValues?.title || "",
        description: defaultValues?.description || "",
        type: defaultValues?.type || "case",
        category: defaultValues?.category || undefined,
        priority: defaultValues?.priority || "medium",
      });
    }
  }, [open, defaultValues, preselectedCustomerId, reset]);

  const handleFormSubmit = (data: AssignmentFormData) => {
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
            {mode === "create" ? "Nytt uppdrag" : "Redigera uppdrag"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id" error={!!errors.customer_id}>
              Kund *
            </Label>
            <Select
              value={customerId}
              onValueChange={(value) => setValue("customer_id", value)}
              disabled={!!preselectedCustomerId}
            >
              <SelectTrigger error={!!errors.customer_id}>
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
            {errors.customer_id && (
              <p className="text-sm text-terracotta">
                {errors.customer_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" error={!!errors.title}>
              Titel *
            </Label>
            <Input id="title" error={!!errors.title} {...register("title")} />
            {errors.title && (
              <p className="text-sm text-terracotta">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Typ</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) =>
                  setValue("type", value as AssignmentFormData["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGNMENT_TYPE_LABELS).map(
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
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={category || ""}
                onValueChange={(value) =>
                  setValue("category", value as AssignmentFormData["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGNMENT_CATEGORY_LABELS).map(
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
            <Label htmlFor="priority">Prioritet</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setValue("priority", value as AssignmentFormData["priority"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea id="description" rows={3} {...register("description")} />
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
                  ? "Skapa uppdrag"
                  : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
