import { useState } from "react";
import {
  FileText,
  CheckCircle,
  Download,
  Lock,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  useBillingBatches,
  useUpdateBillingBatchStatus,
} from "@/hooks/useBilling";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { BATCH_STATUS_LABELS } from "@/lib/constants";
import { BillingDetail } from "./BillingDetail";

interface BillingBatchListProps {
  year?: number;
  month?: number;
}

const statusVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  draft: "outline",
  review: "sage",
  exported: "terracotta",
  locked: "outline",
};

export function BillingBatchList({ year, month }: BillingBatchListProps) {
  const {
    data: batches,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBillingBatches(year, month);
  const updateStatus = useUpdateBillingBatchStatus();

  const [exportConfirm, setExportConfirm] = useState<string | null>(null);
  const [lockConfirm, setLockConfirm] = useState<string | null>(null);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-ash">Laddar batches...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Kunde inte hämta fakturabatcher"
            message={
              error.message || "Ett fel uppstod vid hämtning av fakturabatcher."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Inga fakturaunderlag"
        description="Skapa fakturaunderlag från periodoversikten ovan"
      />
    );
  }

  const handleExport = async () => {
    if (exportConfirm) {
      await updateStatus.mutateAsync({ id: exportConfirm, status: "exported" });
      setExportConfirm(null);
    }
  };

  const handleLock = async () => {
    if (lockConfirm) {
      await updateStatus.mutateAsync({ id: lockConfirm, status: "locked" });
      setLockConfirm(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fakturaunderlag</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Kund</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    {batch.batch_id}
                  </TableCell>
                  <TableCell>{batch.customer.name}</TableCell>
                  <TableCell>
                    {batch.period_year}-
                    {String(batch.period_month).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(batch.total_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[batch.status]}>
                      {BATCH_STATUS_LABELS[batch.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                          onClick={() => setDetailBatchId(batch.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visa underlag
                        </DropdownMenuItem>
                        {batch.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus.mutate({
                                id: batch.id,
                                status: "review",
                              })
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Markera för granskning
                          </DropdownMenuItem>
                        )}
                        {batch.status === "review" && (
                          <DropdownMenuItem
                            onClick={() => setExportConfirm(batch.id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Markera som exporterad
                          </DropdownMenuItem>
                        )}
                        {batch.status === "exported" && (
                          <DropdownMenuItem
                            onClick={() => setLockConfirm(batch.id)}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Lås batch
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!exportConfirm}
        onOpenChange={(open) => !open && setExportConfirm(null)}
        title="Markera som exporterad"
        description="Är du säker på att du vill markera denna batch som exporterad? Tidposterna kommer låsas."
        confirmLabel="Exportera"
        onConfirm={handleExport}
        isLoading={updateStatus.isPending}
      />

      <ConfirmDialog
        open={!!lockConfirm}
        onOpenChange={(open) => !open && setLockConfirm(null)}
        title="Lås batch"
        description="Är du säker på att du vill låsa denna batch? Detta kan inte ångras."
        variant="danger"
        confirmLabel="Lås"
        onConfirm={handleLock}
        isLoading={updateStatus.isPending}
      />

      <BillingDetail
        batchId={detailBatchId}
        open={!!detailBatchId}
        onOpenChange={(open) => !open && setDetailBatchId(null)}
      />
    </>
  );
}
