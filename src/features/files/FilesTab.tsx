import { useRef, useState } from "react";
import {
  Download,
  FileText,
  Image,
  Film,
  Upload,
  Trash2,
  Paperclip,
} from "lucide-react";
import {
  useFilesByAssignment,
  useFilesByCustomer,
  useUploadFiles,
  useDeleteFile,
  useCreateFileDownloadUrl,
} from "@/hooks/useFiles";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  FILE_UPLOAD_ALLOWED_EXTENSIONS,
  FILE_UPLOAD_ALLOWED_TYPES,
  FILE_UPLOAD_BLOCKED_EXTENSIONS,
  FILE_UPLOAD_MAX_SIZE,
  FILE_UPLOAD_MAX_SIZE_LABEL,
} from "@/lib/constants";
import type { FileRecord } from "@/types/database";
import { toast } from "sonner";

interface FilesTabProps {
  customerId?: string;
  assignmentId?: string;
}

function getFileIcon(mimeType: string | null) {
  if (mimeType?.startsWith("image/")) return Image;
  if (mimeType?.startsWith("video/")) return Film;
  return FileText;
}

function getValidationError(file: File): string | null {
  if (file.size > FILE_UPLOAD_MAX_SIZE) {
    return `Filen "${file.name}" är för stor (max ${FILE_UPLOAD_MAX_SIZE_LABEL})`;
  }

  const fileName = file.name.toLowerCase();
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";

  if (extension && FILE_UPLOAD_BLOCKED_EXTENSIONS.includes(extension)) {
    return `Filtypen "${extension}" är inte tillåten av säkerhetsskäl`;
  }

  const hasMimeType = Boolean(file.type);
  const mimeAllowed =
    !hasMimeType || FILE_UPLOAD_ALLOWED_TYPES.includes(file.type);
  const extensionAllowed = extension
    ? FILE_UPLOAD_ALLOWED_EXTENSIONS.includes(extension)
    : false;

  if (hasMimeType) {
    if (!mimeAllowed && !extensionAllowed) {
      return `Filtypen "${file.type}" är inte tillåten för "${file.name}"`;
    }
  } else if (!extensionAllowed) {
    return `Filtypen kunde inte verifieras för "${file.name}"`;
  }

  return null;
}

export function FilesTab({ customerId, assignmentId }: FilesTabProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filesQuery = assignmentId
    ? useFilesByAssignment(assignmentId)
    : useFilesByCustomer(customerId);

  const uploadFiles = useUploadFiles();
  const deleteFile = useDeleteFile();
  const downloadUrl = useCreateFileDownloadUrl();

  const files = filesQuery.data || [];

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    if (fileList.length === 0) return;

    for (const file of fileList) {
      const validationError = getValidationError(file);
      if (validationError) {
        toast.error(validationError);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }
    }

    try {
      await uploadFiles.mutateAsync({
        files: fileList,
        customerId,
        assignmentId,
      });
    } catch {
      // Fel hanteras i useUploadFiles onError
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDownload = async (file: FileRecord) => {
    setDownloadingId(file.id);
    try {
      const signedUrl = await downloadUrl.mutateAsync(file.file_path);
      window.open(signedUrl, "_blank", "noopener");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteFile.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
  };

  if (filesQuery.isLoading) {
    return <div className="text-ash">Laddar filer...</div>;
  }

  if (filesQuery.error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Kunde inte hämta filer"
            message={
              filesQuery.error.message ||
              "Ett fel uppstod vid hämtning av filer."
            }
            onRetry={() => filesQuery.refetch()}
            isRetrying={filesQuery.isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Filer
          </CardTitle>
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={FILE_UPLOAD_ALLOWED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploadFiles.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadFiles.isPending ? "Laddar upp..." : "Ladda upp"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Inga filer"
              description="Ladda upp dokument, bilder eller andra filer kopplade till detta objekt."
              action={
                <Button onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Ladda upp fil
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fil</TableHead>
                  <TableHead>Storlek</TableHead>
                  <TableHead>Skapad</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => {
                  const Icon = getFileIcon(file.mime_type);
                  return (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-sand/50 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-charcoal" />
                          </div>
                          <div>
                            <div className="font-medium text-charcoal">
                              {file.file_name}
                            </div>
                            {file.mime_type && (
                              <div className="text-xs text-ash">
                                {file.mime_type}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-ash">
                        {formatFileSize(file.file_size)}
                      </TableCell>
                      <TableCell className="text-ash">
                        {formatDate(file.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            disabled={
                              downloadingId === file.id || downloadUrl.isPending
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(file)}
                          >
                            <Trash2 className="h-4 w-4 text-terracotta" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort fil"
        description="Är du säker på att du vill ta bort denna fil?"
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDelete}
        isLoading={deleteFile.isPending}
      />
    </>
  );
}
