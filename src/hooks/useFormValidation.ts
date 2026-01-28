import { useState, useCallback, useMemo } from "react";
import { z } from "zod";

export interface ValidationError {
  field: string;
  message: string;
}

export interface UseFormValidationOptions<T extends z.ZodRawShape> {
  schema: z.ZodObject<T>;
  initialValues?: Partial<z.infer<z.ZodObject<T>>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormValidationReturn<T extends z.ZodRawShape> {
  values: Partial<z.infer<z.ZodObject<T>>>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setValue: <K extends keyof z.infer<z.ZodObject<T>>>(
    field: K,
    value: z.infer<z.ZodObject<T>>[K],
  ) => void;
  setValues: (values: Partial<z.infer<z.ZodObject<T>>>) => void;
  setTouched: (field: keyof z.infer<z.ZodObject<T>>) => void;
  setError: (field: keyof z.infer<z.ZodObject<T>>, message: string) => void;
  clearError: (field: keyof z.infer<z.ZodObject<T>>) => void;
  clearErrors: () => void;
  validate: () => boolean;
  validateField: (field: keyof z.infer<z.ZodObject<T>>) => boolean;
  reset: () => void;
  getFieldProps: (field: keyof z.infer<z.ZodObject<T>>) => FieldProps;
}

export interface FieldProps {
  value: unknown;
  error?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onBlur: () => void;
}

/**
 * useFormValidation - Form state and validation hook with Zod
 *
 * @example
 * const schema = z.object({
 *   email: z.string().email("Ogiltig e-postadress"),
 *   name: z.string().min(2, "Minst 2 tecken"),
 * });
 *
 * const form = useFormValidation({
 *   schema,
 *   validateOnBlur: true,
 * });
 *
 * <FormField
 *   label="E-post"
 *   {...form.getFieldProps("email")}
 * />
 */
export function useFormValidation<T extends z.ZodRawShape>({
  schema,
  initialValues = {},
  validateOnChange = false,
  validateOnBlur = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  type FormValues = z.infer<z.ZodObject<T>>;

  const [values, setValuesState] = useState<Partial<FormValues>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [initialValuesSnapshot] = useState(initialValues);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesSnapshot);
  }, [values, initialValuesSnapshot]);

  const isValid = useMemo(() => {
    const result = schema.safeParse(values);
    return result.success;
  }, [schema, values]);

  const validateField = useCallback(
    (field: keyof FormValues): boolean => {
      // Validate the entire object but only show error for this field
      const result = schema.safeParse(values);
      if (result.success) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as string];
          return next;
        });
        return true;
      }

      // Find error for this specific field
      const fieldError = result.error.issues.find(
        (issue) => issue.path[0] === field,
      );

      if (fieldError) {
        setErrors((prev) => ({
          ...prev,
          [field as string]: fieldError.message,
        }));
        return false;
      }

      // No error for this field
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
      return true;
    },
    [schema, values],
  );

  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values);

    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");
      if (!newErrors[field]) {
        newErrors[field] = issue.message;
      }
    });
    setErrors(newErrors);

    // Mark all fields with errors as touched
    const newTouched: Record<string, boolean> = { ...touched };
    Object.keys(newErrors).forEach((field) => {
      newTouched[field] = true;
    });
    setTouchedState(newTouched);

    return false;
  }, [schema, values, touched]);

  const setValue = useCallback(
    <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));
      if (validateOnChange) {
        // Delay validation to next tick so state is updated
        setTimeout(() => validateField(field), 0);
      }
    },
    [validateOnChange, validateField],
  );

  const setValues = useCallback((newValues: Partial<FormValues>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  const setTouched = useCallback(
    (field: keyof FormValues) => {
      setTouchedState((prev) => ({ ...prev, [field as string]: true }));
      if (validateOnBlur) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField],
  );

  const setError = useCallback((field: keyof FormValues, message: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: message }));
  }, []);

  const clearError = useCallback((field: keyof FormValues) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValuesSnapshot);
    setErrors({});
    setTouchedState({});
  }, [initialValuesSnapshot]);

  const getFieldProps = useCallback(
    (field: keyof FormValues): FieldProps => ({
      value: values[field] ?? "",
      error: touched[field as string] ? errors[field as string] : undefined,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        setValue(
          field as keyof FormValues,
          e.target.value as FormValues[keyof FormValues],
        );
      },
      onBlur: () => {
        setTouched(field);
      },
    }),
    [values, errors, touched, setValue, setTouched],
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setValues,
    setTouched,
    setError,
    clearError,
    clearErrors,
    validate,
    validateField,
    reset,
    getFieldProps,
  };
}

/**
 * Common validation patterns for Swedish forms
 */
export const validationPatterns = {
  /** Swedish email validation */
  email: z.string().email("Ogiltig e-postadress"),

  /** Swedish phone number (starts with +46 or 0) */
  phone: z
    .string()
    .regex(/^(\+46|0)[0-9\s-]{8,}$/, "Ogiltigt telefonnummer")
    .optional()
    .or(z.literal("")),

  /** Swedish postal code (XXX XX) */
  postalCode: z
    .string()
    .regex(/^\d{3}\s?\d{2}$/, "Ogiltigt postnummer")
    .optional()
    .or(z.literal("")),

  /** Swedish organization number (XXXXXX-XXXX) */
  orgNumber: z
    .string()
    .regex(/^\d{6}-?\d{4}$/, "Ogiltigt organisationsnummer")
    .optional()
    .or(z.literal("")),

  /** Required string field */
  required: (message = "Detta fält är obligatoriskt") =>
    z.string().min(1, message),

  /** Minimum length validation */
  minLength: (min: number, message?: string) =>
    z.string().min(min, message || `Minst ${min} tecken`),

  /** Maximum length validation */
  maxLength: (max: number, message?: string) =>
    z.string().max(max, message || `Max ${max} tecken`),

  /** Positive number validation */
  positiveNumber: z.number().positive("Måste vara positivt"),

  /** URL validation */
  url: z.string().url("Ogiltig URL").optional().or(z.literal("")),
};
