import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCustomers } from "@/hooks/useCustomers";
import { useAssignments } from "@/hooks/useAssignments";
import { useAllProfiles } from "@/hooks/useProfile";
import { PRIORITY_LABELS } from "@/lib/constants";
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
import type { Task } from "@/types/database";

const taskSchema = z.object({
  title: z.string().min(1, "Titel krävs"),
  description: z.string().optional(),
  customer_id: z.string().optional(),
  assignment_id: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.string().optional(),
});

type TaskFormInput = z.input<typeof taskSchema>;
type TaskFormData = z.output<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<Task>;
  mode?: "create" | "edit";
  presetCustomerId?: string;
  presetAssignmentId?: string;
}

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultValues,
  mode = "create",
  presetCustomerId,
  presetAssignmentId,
}: TaskFormProps) {
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const { data: profiles } = useAllProfiles();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormInput, unknown, TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const customerId = watch("customer_id");
  const priority = watch("priority");

  // Filter assignments by selected customer
  const filteredAssignments = customerId
    ? assignments?.filter((a) => a.customer_id === customerId)
    : assignments;

  useEffect(() => {
    if (open) {
      reset({
        title: defaultValues?.title || "",
        description: defaultValues?.description || "",
        customer_id:
          defaultValues?.customer_id || presetCustomerId || undefined,
        assignment_id:
          defaultValues?.assignment_id || presetAssignmentId || undefined,
        due_date: defaultValues?.due_date || undefined,
        priority: defaultValues?.priority || "medium",
        assigned_to: defaultValues?.assigned_to || undefined,
      });
    }
  }, [open, defaultValues, reset, presetCustomerId, presetAssignmentId]);

  const handleFormSubmit = (data: TaskFormData) => {
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
            {mode === "create" ? "Ny uppgift" : "Redigera uppgift"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" error={!!errors.title}>
              Titel *
            </Label>
            <Input
              id="title"
              error={!!errors.title}
              errorId={errors.title ? "title-error" : undefined}
              {...register("title")}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-terracotta">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Kund</Label>
              <Select
                value={customerId || ""}
                onValueChange={(value) => {
                  setValue("customer_id", value || undefined);
                  setValue("assignment_id", undefined); // Reset assignment when customer changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kund (valfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment_id">Uppdrag</Label>
              <Select
                value={watch("assignment_id") || ""}
                onValueChange={(value) =>
                  setValue("assignment_id", value || undefined)
                }
                disabled={!customerId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      customerId ? "Välj uppdrag" : "Välj kund först"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignments?.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.assignment_number} - {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Förfallodatum</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet</Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setValue("priority", value as TaskFormData["priority"])
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Tilldela till</Label>
            <Select
              value={watch("assigned_to") || ""}
              onValueChange={(value) =>
                setValue("assigned_to", value || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj person (valfritt)" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
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
                  ? "Skapa uppgift"
                  : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
