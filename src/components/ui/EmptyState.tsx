import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        {
          "py-8 px-4": size === "sm",
          "py-12 px-6": size === "md",
          "py-16 px-8": size === "lg",
        },
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-sand/50 mb-4",
          {
            "w-12 h-12": size === "sm",
            "w-16 h-16": size === "md",
            "w-20 h-20": size === "lg",
          },
        )}
      >
        <Icon
          className={cn("text-ash", {
            "h-6 w-6": size === "sm",
            "h-8 w-8": size === "md",
            "h-10 w-10": size === "lg",
          })}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h3
        className={cn("font-display font-semibold text-charcoal mb-2", {
          "text-base": size === "sm",
          "text-lg": size === "md",
          "text-xl": size === "lg",
        })}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn("text-ash max-w-sm mb-6", {
            "text-xs": size === "sm",
            "text-sm": size === "md",
            "text-base": size === "lg",
          })}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || "outline"}
              size={size === "lg" ? "md" : "sm"}
              onClick={secondaryAction.onClick}
              leftIcon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              variant={action.variant || "primary"}
              size={size === "lg" ? "md" : "sm"}
              onClick={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Common empty state presets for reuse
export const emptyStatePresets = {
  noCustomers: {
    title: "Inga kunder än",
    description:
      "Kom igång genom att lägga till din första kund. Du kan importera från Excel eller skapa manuellt.",
  },
  noAssignments: {
    title: "Inga uppdrag",
    description: "Skapa ett uppdrag för att börja spåra arbete och tid.",
  },
  noTasks: {
    title: "Inga uppgifter",
    description:
      "Alla uppgifter är avklarade! Skapa nya uppgifter för att hålla koll på vad som ska göras.",
  },
  noResults: {
    title: "Inga resultat",
    description:
      "Din sökning gav inga träffar. Prova att ändra sökord eller filter.",
  },
  noTimeEntries: {
    title: "Ingen tid loggad",
    description: "Börja logga tid för att se din arbetade tid här.",
  },
  noDocuments: {
    title: "Inga dokument",
    description: "Ladda upp dokument för att hålla dem organiserade.",
  },
  error: {
    title: "Något gick fel",
    description:
      "Ett oväntat fel uppstod. Försök igen eller kontakta support om problemet kvarstår.",
  },
};
