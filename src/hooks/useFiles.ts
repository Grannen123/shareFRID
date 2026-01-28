import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  FILES_BUCKET,
  FILE_UPLOAD_MAX_SIZE,
  FILE_UPLOAD_MAX_SIZE_LABEL,
  FILE_UPLOAD_ALLOWED_TYPES,
  FILE_UPLOAD_ALLOWED_EXTENSIONS,
  FILE_UPLOAD_BLOCKED_EXTENSIONS,
} from "@/lib/constants";
import type { FileRecord } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UploadFilesInput {
  files: File[];
  customerId?: string;
  assignmentId?: string;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validerar en fil för uppladdning
 * Kontrollerar storlek, MIME-typ och filnamn
 */
function validateFile(file: File): FileValidationResult {
  // Kontrollera storlek
  if (file.size > FILE_UPLOAD_MAX_SIZE) {
    return {
      valid: false,
      error: `Filen "${file.name}" är för stor (max ${FILE_UPLOAD_MAX_SIZE_LABEL})`,
    };
  }

  const fileName = file.name.toLowerCase();
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";

  // Blockera farliga tillagg direkt
  if (extension && FILE_UPLOAD_BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Filtypen "${extension}" är inte tillåten av säkerhetsskäl`,
    };
  }

  const hasMimeType = Boolean(file.type);
  const mimeAllowed =
    !hasMimeType || FILE_UPLOAD_ALLOWED_TYPES.includes(file.type);
  const extensionAllowed = extension
    ? FILE_UPLOAD_ALLOWED_EXTENSIONS.includes(extension)
    : false;

  if (hasMimeType) {
    if (!mimeAllowed && !extensionAllowed) {
      return {
        valid: false,
        error: `Filtypen "${file.type}" är inte tillåten för "${file.name}"`,
      };
    }
  } else if (!extensionAllowed) {
    return {
      valid: false,
      error: `Filtypen kunde inte verifieras för "${file.name}"`,
    };
  }

  // Kontrollera för dubbla tillägg (t.ex. "virus.pdf.exe")
  const parts = fileName.split(".");
  if (parts.length > 2) {
    for (let i = 0; i < parts.length - 1; i++) {
      const possibleExt = "." + parts[i];
      if (FILE_UPLOAD_BLOCKED_EXTENSIONS.includes(possibleExt)) {
        return {
          valid: false,
          error: `Misstänkt filnamn: "${file.name}" innehåller farligt tillägg`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Sanerar filnamn för säker lagring
 * Tar bort path traversal-tecken och farliga tecken
 */
function sanitizeFileName(name: string): string {
  // Avkoda URL-kodade tecken först för att fånga %2f, %2e etc.
  let safeName = name;
  try {
    // Försök avkoda - om det misslyckas, använd originalnamnet
    safeName = decodeURIComponent(name);
  } catch {
    // Ignorera avkodningsfel
  }

  // Ta bort null bytes (null byte injection attack)
  safeName = safeName.replace(/\0/g, "");

  // Ta bort path traversal-tecken
  safeName = safeName
    .replace(/\.\./g, "_") // Förhindra path traversal (..)
    .replace(/[/\\]/g, "_") // Ta bort snedstreck
    .replace(/[\x00-\x1f\x7f]/g, "") // Ta bort kontrolltecken
    .replace(/[<>:"|?*]/g, "_"); // Ta bort Windows-förbjudna tecken

  // Normalisera Unicode till NFC för att förhindra homoglyph-attacker
  safeName = safeName.normalize("NFC");

  // Begränsa till säkra tecken (ASCII alfanumeriska + ._-)
  safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Ta bort upprepade understreck
  safeName = safeName.replace(/_+/g, "_");

  // Ta bort ledande/efterföljande punkter och mellanslag
  safeName = safeName.replace(/^[.\s_]+|[.\s_]+$/g, "");

  // Förhindra tomma filnamn
  if (!safeName || safeName === "_") {
    safeName = "file";
  }

  // Begränsa längd
  if (safeName.length > 200) {
    const ext = safeName.lastIndexOf(".");
    if (ext > 0) {
      const extension = safeName.substring(ext);
      safeName = safeName.substring(0, 200 - extension.length) + extension;
    } else {
      safeName = safeName.substring(0, 200);
    }
  }

  return safeName;
}

function buildFilePath({
  fileName,
  customerId,
  assignmentId,
}: {
  fileName: string;
  customerId?: string;
  assignmentId?: string;
}): string {
  const safeName = sanitizeFileName(fileName);
  if (assignmentId) {
    return `assignments/${assignmentId}/${crypto.randomUUID()}-${safeName}`;
  }
  if (customerId) {
    return `customers/${customerId}/${crypto.randomUUID()}-${safeName}`;
  }
  return `misc/${crypto.randomUUID()}-${safeName}`;
}

export function useFilesByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.files.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("files")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as FileRecord[];
    },
    enabled: !!customerId,
  });
}

export function useFilesByAssignment(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.files.byAssignment(assignmentId || ""),
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("files")
          .select("*")
          .eq("assignment_id", assignmentId)
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as FileRecord[];
    },
    enabled: !!assignmentId,
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      files,
      customerId,
      assignmentId,
    }: UploadFilesInput) => {
      if (!customerId && !assignmentId) {
        throw new Error("Kund eller uppdrag saknas för filuppladdning.");
      }

      // Validera alla filer först
      for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      const uploaded: FileRecord[] = [];

      for (const file of files) {
        const filePath = buildFilePath({
          fileName: file.name,
          customerId,
          assignmentId,
        });

        const { error: uploadError } = await withTimeout(
          supabase.storage.from(FILES_BUCKET).upload(filePath, file, {
            contentType: file.type || undefined,
            upsert: false,
          }),
          20000,
        );

        if (uploadError) throw uploadError;

        const { data, error } = await withTimeout(
          supabase
            .from("files")
            .insert({
              customer_id: customerId || null,
              assignment_id: assignmentId || null,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type || null,
              uploaded_by: user?.id,
            })
            .select()
            .single(),
        );

        if (error) throw error;
        uploaded.push(data as FileRecord);
      }

      return uploaded;
    },
    onSuccess: (_, variables) => {
      if (variables.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.byCustomer(variables.customerId),
        });
      }
      if (variables.assignmentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.byAssignment(variables.assignmentId),
        });
      }
      toast.success("Fil(er) uppladdade!");
    },
    onError: (error) => {
      console.error("Upload files error:", error);
      toast.error("Kunde inte ladda upp filer: " + error.message);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: FileRecord) => {
      const { error: storageError } = await withTimeout(
        supabase.storage.from(FILES_BUCKET).remove([file.file_path]),
        20000,
      );

      if (storageError) throw storageError;

      const { error } = await withTimeout(
        supabase.from("files").delete().eq("id", file.id),
      );

      if (error) throw error;
      return file;
    },
    onSuccess: (file) => {
      if (file.customer_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.byCustomer(file.customer_id),
        });
      }
      if (file.assignment_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.byAssignment(file.assignment_id),
        });
      }
      toast.success("Fil borttagen.");
    },
    onError: (error) => {
      console.error("Delete file error:", error);
      toast.error("Kunde inte ta bort fil: " + error.message);
    },
  });
}

export function useCreateFileDownloadUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await withTimeout(
        supabase.storage.from(FILES_BUCKET).createSignedUrl(filePath, 300),
        10000,
      );

      if (error) throw error;
      return data.signedUrl;
    },
    onError: (error) => {
      console.error("Create download url error:", error);
      toast.error("Kunde inte skapa nedladdningslänk: " + error.message);
    },
  });
}
