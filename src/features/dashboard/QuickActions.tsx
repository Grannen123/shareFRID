import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Briefcase, CheckSquare, Clock } from "lucide-react";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { useCreateAssignment } from "@/hooks/useAssignments";
import { useCreateTask } from "@/hooks/useTasks";
import { Button } from "@/components/ui/Button";
import { CustomerForm } from "@/features/customers/CustomerForm";
import { AssignmentForm } from "@/features/assignments/AssignmentForm";
import { TaskForm } from "@/features/tasks/TaskForm";
import type {
  CustomerFormData,
  AssignmentFormData,
  TaskFormData,
} from "@/lib/schemas";

export function QuickActions() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();
  const createAssignment = useCreateAssignment();
  const createTask = useCreateTask();

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const handleCreateCustomer = async (data: CustomerFormData) => {
    const result = await createCustomer.mutateAsync(data);
    setShowCustomerForm(false);
    navigate(`/customers/${result.id}`);
  };

  const handleCreateAssignment = async (data: AssignmentFormData) => {
    const result = await createAssignment.mutateAsync(data);
    setShowAssignmentForm(false);
    navigate(`/assignments/${result.id}`);
  };

  const handleCreateTask = async (data: TaskFormData) => {
    await createTask.mutateAsync(data);
    setShowTaskForm(false);
  };

  const quickActions = [
    {
      label: "Ny kund",
      icon: Building2,
      onClick: () => setShowCustomerForm(true),
      shortcut: "K",
    },
    {
      label: "Nytt uppdrag",
      icon: Briefcase,
      onClick: () => setShowAssignmentForm(true),
      shortcut: "U",
    },
    {
      label: "Ny uppgift",
      icon: CheckSquare,
      onClick: () => setShowTaskForm(true),
      shortcut: "T",
    },
    {
      label: "Registrera tid",
      icon: Clock,
      onClick: () => navigate("/assignments"),
      shortcut: "R",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ash mr-2">
          Snabbåtgärder:
        </span>
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <CustomerForm
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onSubmit={handleCreateCustomer}
        isLoading={createCustomer.isPending}
        mode="create"
      />

      <AssignmentForm
        open={showAssignmentForm}
        onOpenChange={setShowAssignmentForm}
        onSubmit={handleCreateAssignment}
        isLoading={createAssignment.isPending}
        mode="create"
      />

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
        mode="create"
      />
    </>
  );
}
