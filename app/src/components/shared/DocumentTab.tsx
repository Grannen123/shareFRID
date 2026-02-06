/**
 * DocumentTab Component
 *
 * A reusable component for displaying SharePoint documents
 * connected to customers or cases.
 */

import { useState, useCallback, useRef } from "react";
import {
  Folder,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  ChevronRight,
  MoreVertical,
  Loader2,
  AlertCircle,
  FolderPlus,
  Link as LinkIcon,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDriveItems,
  useCreateFolder,
  useUploadFile,
  useDownloadFile,
  useDeleteItem,
  useSearchDrive,
  useCreateSharingLink,
  type GraphDriveItem,
} from "@/hooks/useGraphApi";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface DocumentTabProps {
  driveId: string | null;
  folderId?: string;
  title?: string;
  onFolderChange?: (folderId: string | undefined) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowCreateFolder?: boolean;
}

// Get icon for file type
function getFileIcon(item: GraphDriveItem) {
  if (item.folder) {
    return <Folder className="h-5 w-5 text-yellow-500" />;
  }

  const mimeType = item.file?.mimeType || "";
  const name = item.name.toLowerCase();

  if (
    mimeType.includes("spreadsheet") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (
    mimeType.includes("document") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  if (mimeType.includes("image")) {
    return <FileImage className="h-5 w-5 text-purple-500" />;
  }
  if (name.endsWith(".pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }

  return <File className="h-5 w-5 text-gray-500" />;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentTab({
  driveId,
  folderId,
  title = "Dokument",
  onFolderChange,
  allowUpload = true,
  allowDelete = true,
  allowCreateFolder = true,
}: DocumentTabProps) {
  const { isMicrosoftConnected } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries and mutations
  const {
    data: items,
    isLoading,
    error,
    refetch,
  } = useDriveItems(driveId, folderId);
  const { data: searchResults } = useSearchDrive(
    isSearching ? driveId : null,
    searchQuery,
  );
  const createFolder = useCreateFolder();
  const uploadFile = useUploadFile();
  const downloadFile = useDownloadFile();
  const deleteItem = useDeleteItem();
  const createSharingLink = useCreateSharingLink();

  // Navigate to folder
  const navigateToFolder = useCallback(
    (item: GraphDriveItem) => {
      if (!item.folder) return;

      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
      onFolderChange?.(item.id);
    },
    [onFolderChange],
  );

  // Navigate back via breadcrumb
  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      if (index === -1) {
        // Navigate to root
        setBreadcrumbs([]);
        onFolderChange?.(undefined);
      } else {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        onFolderChange?.(newBreadcrumbs[newBreadcrumbs.length - 1]?.id);
      }
    },
    [breadcrumbs, onFolderChange],
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !driveId) return;

      const parentId = folderId || "root";

      for (const file of Array.from(files)) {
        try {
          await uploadFile.mutateAsync({
            driveId,
            parentId,
            fileName: file.name,
            content: file,
            contentType: file.type,
          });
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      refetch();
    },
    [driveId, folderId, uploadFile, refetch],
  );

  // Handle folder creation
  const handleCreateFolder = useCallback(async () => {
    if (!driveId || !newFolderName.trim()) return;

    try {
      await createFolder.mutateAsync({
        driveId,
        parentId: folderId || "root",
        folderName: newFolderName.trim(),
      });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
      refetch();
    } catch (err) {
      console.error("Create folder failed:", err);
    }
  }, [driveId, folderId, newFolderName, createFolder, refetch]);

  // Handle file download
  const handleDownload = useCallback(
    async (item: GraphDriveItem) => {
      if (!driveId || item.folder) return;

      try {
        const blob = await downloadFile.mutateAsync({
          driveId,
          itemId: item.id,
        });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download failed:", err);
      }
    },
    [driveId, downloadFile],
  );

  // Handle delete
  const handleDelete = useCallback(
    async (item: GraphDriveItem) => {
      if (!driveId) return;

      if (!confirm(`Är du säker på att du vill ta bort "${item.name}"?`)) {
        return;
      }

      try {
        await deleteItem.mutateAsync({
          driveId,
          itemId: item.id,
        });
        refetch();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [driveId, deleteItem, refetch],
  );

  // Handle sharing link creation
  const handleShare = useCallback(
    async (item: GraphDriveItem) => {
      if (!driveId) return;

      try {
        const result = await createSharingLink.mutateAsync({
          driveId,
          itemId: item.id,
          type: "view",
          scope: "organization",
        });

        // Copy to clipboard
        await navigator.clipboard.writeText(result.link.webUrl);
        alert("Delningslänk kopierad till urklipp!");
      } catch (err) {
        console.error("Share failed:", err);
      }
    },
    [driveId, createSharingLink],
  );

  // Toggle search mode
  const handleSearchToggle = useCallback(() => {
    setIsSearching(!isSearching);
    if (isSearching) {
      setSearchQuery("");
    }
  }, [isSearching]);

  // Not connected to Microsoft
  if (!isMicrosoftConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Microsoft-konto krävs
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Anslut ditt Microsoft-konto för att se och hantera dokument i
              SharePoint.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No drive configured
  if (!driveId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Ingen dokumentmapp konfigurerad
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Kontakta administratören för att koppla en SharePoint-mapp till
              denna kund.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayItems =
    isSearching && searchQuery
      ? searchResults?.value || []
      : items?.value || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchToggle}
              className={cn(isSearching && "bg-gray-100")}
            >
              <Search className="h-4 w-4" />
            </Button>
            {allowCreateFolder && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            )}
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFile.isPending}
                >
                  {uploadFile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Ladda upp
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search input */}
        {isSearching && (
          <div className="mt-3">
            <Input
              placeholder="Sök dokument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}

        {/* Breadcrumbs */}
        {!isSearching && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className="hover:text-primary-600"
            >
              Rot
            </button>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="hover:text-primary-600"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-600">Kunde inte ladda dokument</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500">
              {isSearching ? "Inga sökresultat" : "Mappen är tom"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 cursor-pointer"
                onClick={() => {
                  if (item.folder) {
                    navigateToFolder(item);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(item)}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {item.folder ? (
                        <span>{item.folder.childCount} objekt</span>
                      ) : (
                        <span>{formatFileSize(item.size)}</span>
                      )}
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(
                          new Date(item.lastModifiedDateTime),
                          {
                            addSuffix: true,
                            locale: sv,
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.webUrl, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Öppna i SharePoint
                    </DropdownMenuItem>
                    {!item.folder && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Ladda ner
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(item);
                      }}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Kopiera delningslänk
                    </DropdownMenuItem>
                    {allowDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create folder dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa ny mapp</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Mappnamn"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Skapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
