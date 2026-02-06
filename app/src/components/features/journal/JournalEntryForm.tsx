/**
 * Journal Entry Form Component
 *
 * Form for creating and editing journal entries with:
 * - Time tracking
 * - Entry type selection
 * - Billing type selection
 * - Invoice text generation
 * - Markdown support
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Clock,
  FileText,
  Phone,
  Mail,
  Users,
  MapPin,
  Settings,
  HelpCircle,
  Mic,
  Loader2,
  Save,
  X,
  Square,
} from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import {
  useKeyboardShortcut,
  SHORTCUTS,
  formatShortcut,
} from "@/hooks/useKeyboardShortcut";
import {
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import {
  journalEntrySchema,
  type JournalEntryFormData,
  type JournalEntryFormInput,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Entry type configuration
const ENTRY_TYPES = [
  { value: "samtal", label: "Samtal", icon: Phone, color: "text-blue-500" },
  { value: "mail", label: "Mail", icon: Mail, color: "text-green-500" },
  { value: "mote", label: "Möte", icon: Users, color: "text-purple-500" },
  {
    value: "platsbesok",
    label: "Platsbesök",
    icon: MapPin,
    color: "text-orange-500",
  },
  {
    value: "internt",
    label: "Internt",
    icon: Settings,
    color: "text-gray-500",
  },
  {
    value: "ovrigt",
    label: "Övrigt",
    icon: HelpCircle,
    color: "text-gray-400",
  },
] as const;

const BILLING_TYPES = [
  {
    value: "normal",
    label: "Normal",
    description: "Faktureras enligt avtal",
  },
  {
    value: "extra",
    label: "Extra",
    description: "Faktureras utöver avtal",
  },
  {
    value: "intern",
    label: "Intern",
    description: "Faktureras ej",
  },
] as const;

// Quick time presets
const TIME_PRESETS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1.5 h", value: 90 },
  { label: "2 h", value: 120 },
];

interface JournalEntryFormProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JournalEntryFormData) => Promise<void>;
  initialData?: Partial<JournalEntryFormData>;
  isEditing?: boolean;
}

export function JournalEntryForm({
  caseId,
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: JournalEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<JournalEntryFormInput, unknown, JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      caseId,
      entryDate: format(new Date(), "yyyy-MM-dd"),
      entryType: "samtal",
      minutes: 30,
      description: "",
      invoiceText: "",
      billingType: "normal",
      ...initialData,
    },
  });

  const minutes = watch("minutes");
  const description = watch("description");
  const entryType = watch("entryType");
  const billingType = watch("billingType");

  // Dictation hook - appends transcript to description
  const handleTranscriptUpdate = useCallback(
    (transcript: string) => {
      const currentDesc = description || "";
      const newDesc = currentDesc
        ? `${currentDesc}\n\n${transcript}`
        : transcript;
      setValue("description", newDesc);
    },
    [description, setValue],
  );

  const {
    isRecording,
    isProcessing,
    audioLevel,
    error: dictationError,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported: recordingSupported,
  } = useDictation({
    language: "sv",
    onTranscriptUpdate: handleTranscriptUpdate,
    maxDuration: 120,
  });

  // Reset form when opened with new data
  useEffect(() => {
    if (isOpen) {
      reset({
        caseId,
        entryDate: format(new Date(), "yyyy-MM-dd"),
        entryType: "samtal",
        minutes: 30,
        description: "",
        invoiceText: "",
        billingType: "normal",
        ...initialData,
      });
    }
  }, [isOpen, caseId, initialData, reset]);

  // Cancel recording when dialog closes
  useEffect(() => {
    if (!isOpen && isRecording) {
      cancelRecording();
    }
  }, [isOpen, isRecording, cancelRecording]);

  // Keyboard shortcuts
  useKeyboardShortcut(
    [
      {
        combo: SHORTCUTS.submit,
        handler: () => {
          if (isOpen && !isSubmitting) {
            handleSubmit(handleFormSubmit)();
          }
        },
        enabled: isOpen,
        description: "Spara journalpost",
      },
      {
        combo: SHORTCUTS.cancel,
        handler: () => {
          if (isOpen) {
            onClose();
          }
        },
        enabled: isOpen,
        description: "Stäng dialogrutan",
      },
    ],
    [isOpen, isSubmitting, handleSubmit, onClose],
  );

  const handleFormSubmit = async (data: JournalEntryFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Failed to submit journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimePreset = (value: number) => {
    setValue("minutes", value);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const generateInvoiceText = () => {
    // Auto-generate invoice text from description
    const typeLabel =
      ENTRY_TYPES.find((t) => t.value === entryType)?.label || entryType;
    const shortDesc =
      description.length > 80
        ? description.substring(0, 80) + "..."
        : description;
    setValue("invoiceText", `${typeLabel}: ${shortDesc}`);
  };

  const formatTimeDisplay = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} min`;
    if (remainingMins === 0) return `${hours} h`;
    return `${hours} h ${remainingMins} min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Redigera journalpost" : "Ny journalpost"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Date and Entry Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Datum</Label>
              <Input
                id="entryDate"
                type="date"
                {...register("entryDate")}
                className={cn(errors.entryDate && "border-red-500")}
              />
              {errors.entryDate && (
                <p className="text-xs text-red-500">
                  {errors.entryDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Typ</Label>
              <div className="grid grid-cols-3 gap-1">
                {ENTRY_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValue("entryType", type.value)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg border transition-colors",
                        entryType === type.value
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", type.color)} />
                      <span className="text-xs mt-1">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label>Tid</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  {...register("minutes", { valueAsNumber: true })}
                  className={cn("w-24", errors.minutes && "border-red-500")}
                  min={1}
                  max={1440}
                />
                <span className="text-sm text-gray-500">min</span>
              </div>

              <div className="flex gap-1">
                {TIME_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={minutes === preset.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimePreset(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <span className="text-sm font-medium text-gray-700 ml-auto">
                = {formatTimeDisplay(minutes || 0)}
              </span>
            </div>
            {errors.minutes && (
              <p className="text-xs text-red-500">{errors.minutes.message}</p>
            )}
          </div>

          {/* Billing Type */}
          <div className="space-y-2">
            <Label>Faktureringstyp</Label>
            <div className="grid grid-cols-3 gap-2">
              {BILLING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue("billingType", type.value)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    billingType === type.value
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Anteckning</Label>
              {recordingSupported && (
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 bg-red-500 rounded-full transition-all duration-100"
                        style={{ width: `${Math.max(8, audioLevel * 0.4)}px` }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-red-500 animate-pulse">
                        Spelar in...
                      </span>
                    </div>
                  )}
                  {isProcessing && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Transkriberar...
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="sm"
                    onClick={handleToggleRecording}
                    disabled={isProcessing}
                    aria-label={
                      isRecording ? "Stoppa inspelning" : "Starta diktering"
                    }
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stoppa
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1" />
                        Diktera
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Beskriv vad som gjordes..."
              rows={5}
              className={cn(
                errors.description && "border-red-500",
                isRecording && "border-red-300 ring-1 ring-red-200",
              )}
              aria-describedby="description-help"
            />
            {dictationError && (
              <p className="text-xs text-red-500">{dictationError}</p>
            )}
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
            <p id="description-help" className="text-xs text-gray-400">
              {description?.length || 0} / 2000 tecken
              {recordingSupported && " • Klicka på mikrofonen för att diktera"}
            </p>
          </div>

          {/* Invoice Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoiceText">Fakturatext (valfritt)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateInvoiceText}
              >
                <FileText className="h-4 w-4 mr-1" />
                Generera
              </Button>
            </div>
            <Input
              id="invoiceText"
              {...register("invoiceText")}
              placeholder="Text som visas på fakturan..."
              maxLength={100}
              className={cn(errors.invoiceText && "border-red-500")}
            />
            {errors.invoiceText && (
              <p className="text-xs text-red-500">
                {errors.invoiceText.message}
              </p>
            )}
            <p className="text-xs text-gray-400">
              Om tom används beskrivningen. Max 100 tecken.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <p className="text-xs text-gray-400 hidden sm:block">
              {formatShortcut(SHORTCUTS.submit)} spara •{" "}
              {formatShortcut(SHORTCUTS.cancel)} avbryt
            </p>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" onClick={onClose}>
                      <X className="h-4 w-4 mr-1" />
                      Avbryt
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatShortcut(SHORTCUTS.cancel)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isEditing ? "Spara" : "Skapa"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatShortcut(SHORTCUTS.submit)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
