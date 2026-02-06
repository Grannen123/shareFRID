import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  FileDown,
} from "lucide-react";
import {
  useCustomersPaged,
  useCreateCustomer,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  AGREEMENT_TYPE_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { BulkActionBar, useBulkSelect } from "@/components/ui/BulkActionBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { CustomerForm } from "./CustomerForm";
import type { CustomerFormData } from "@/lib/schemas";
import type { CustomerWithAgreement } from "@/types/database";

const statusVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  active: "sage",
  prospekt: "outline",
  vilande: "terracotta",
};

export function CustomerList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Debounce search to reduce API calls while typing
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: pagedCustomers,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCustomersPaged(page, pageSize, debouncedSearch);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-open create form when navigated with ?action=create
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setShowCreateForm(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [deleteConfirm, setDeleteConfirm] =
    useState<CustomerWithAgreement | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const customers = pagedCustomers?.data || [];

  // Bulk selection
  const bulkSelect = useBulkSelect({
    items: customers,
    getItemId: useCallback(
      (customer: CustomerWithAgreement) => customer.id,
      [],
    ),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Kunder"
          description="Hantera dina kunder och deras avtal"
        />
        <Card>
          <CardContent className="pt-6">
            <SkeletonTable rows={5} columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Kunder"
          description="Hantera dina kunder och deras avtal"
        />
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Kunde inte hämta kunder"
              message={
                error.message || "Ett fel uppstod vid hämtning av kundlistan."
              }
              onRetry={() => refetch()}
              isRetrying={isRefetching}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCount = pagedCustomers?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleCreateCustomer = async (data: CustomerFormData) => {
    await createCustomer.mutateAsync(data);
    setShowCreateForm(false);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    bulkSelect.clearSelection();
  };

  const handleDeleteCustomer = async () => {
    if (deleteConfirm) {
      await deleteCustomer.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(bulkSelect.selectedIds);
    for (const id of selectedIds) {
      await deleteCustomer.mutateAsync(id);
    }
    bulkSelect.clearSelection();
    setBulkDeleteConfirm(false);
  };

  const handleExportSelected = () => {
    // Export selected customers to CSV
    const selectedCustomers = bulkSelect.selectedItems;
    const csv = [
      ["Kundnummer", "Namn", "Typ", "Status", "E-post", "Telefon"].join(";"),
      ...selectedCustomers.map((c) =>
        [
          c.customer_number,
          c.name,
          c.customer_type || "",
          c.status,
          c.email || "",
          c.phone || "",
        ].join(";"),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kunder-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bulkActions = [
    {
      label: "Exportera",
      icon: FileDown,
      onClick: handleExportSelected,
      variant: "outline" as const,
    },
    {
      label: "Ta bort",
      icon: Trash2,
      onClick: () => setBulkDeleteConfirm(true),
      variant: "danger" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kunder"
        description="Hantera dina kunder och deras avtal"
        actions={
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny kund
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <SearchInput
              placeholder="Sök kunder..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onClear={() => handleSearchChange("")}
              className="max-w-sm"
            />
          </div>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={bulkSelect.selectedIds.size}
            actions={bulkActions}
            onClear={bulkSelect.clearSelection}
            itemLabel="kund"
            itemLabelPlural="kunder"
            className="mb-4"
          />

          {customers.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12" />}
              title={search ? "Inga kunder hittades" : "Inga kunder"}
              description={
                search
                  ? "Ingen kund matchade din sökning."
                  : "Kom igång genom att skapa din första kund."
              }
              action={
                !search && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa kund
                  </Button>
                )
              }
            />
          ) : (
            <Table density="comfortable" hoverable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={bulkSelect.isAllSelected}
                      indeterminate={bulkSelect.isIndeterminate}
                      onCheckedChange={bulkSelect.toggleAll}
                      aria-label="Markera alla"
                    />
                  </TableHead>
                  <TableHead>Kundnummer</TableHead>
                  <TableHead>Namn</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Avtal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    data-selected={bulkSelect.isSelected(customer.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={bulkSelect.isSelected(customer.id)}
                        onCheckedChange={() => bulkSelect.toggle(customer.id)}
                        aria-label={`Markera ${customer.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {customer.customer_number}
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell className="text-ash">
                      {customer.customer_type
                        ? CUSTOMER_TYPE_LABELS[customer.customer_type]
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {customer.agreement ? (
                        <Badge variant="sage">
                          {AGREEMENT_TYPE_LABELS[customer.agreement.type]}
                        </Badge>
                      ) : (
                        <span className="text-ash">Inget avtal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[customer.status]}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/customers/${customer.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/customers/${customer.id}/edit`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Redigera
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(customer);
                            }}
                            className="text-terracotta focus:text-terracotta"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ta bort
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ash">
              <span>
                Visar {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, totalCount)} av {totalCount} kunder
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Föregående
                </Button>
                <span>
                  Sida {page} av {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages}
                >
                  Nästa
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleCreateCustomer}
        isLoading={createCustomer.isPending}
        mode="create"
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort kund"
        description={`Är du säker på att du vill ta bort ${deleteConfirm?.name}? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDeleteCustomer}
        isLoading={deleteCustomer.isPending}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}
        title="Ta bort markerade kunder"
        description={`Är du säker på att du vill ta bort ${bulkSelect.selectedIds.size} kunder? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort alla"
        onConfirm={handleBulkDelete}
        isLoading={deleteCustomer.isPending}
      />
    </div>
  );
}
