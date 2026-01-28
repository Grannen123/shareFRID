import { Clock, AlertTriangle } from "lucide-react";
import { useTimebankStatus } from "@/hooks/useTimebank";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface TimebankWidgetProps {
  agreementId: string;
  customerId: string;
}

export function TimebankWidget({ agreementId }: TimebankWidgetProps) {
  const { data: status, isLoading } = useTimebankStatus(agreementId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timbank
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-ash">Laddar...</div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const progressVariant =
    status.percentUsed >= 90
      ? "terracotta"
      : status.percentUsed >= 75
        ? "warning"
        : "default";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timbank
          {status.isOvertime && (
            <span className="ml-auto text-sm font-normal text-terracotta flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Övertid
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ash">Förbrukat denna period</span>
            <span className="font-medium">
              {status.hoursUsed} / {status.includedHours} tim
            </span>
          </div>
          <ProgressBar
            value={Math.min(status.percentUsed, 100)}
            variant={progressVariant}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-ash block">Kvar</span>
            <span className="font-medium text-lg">
              {status.hoursRemaining} tim
            </span>
          </div>
          {status.overtimeHours > 0 && (
            <div>
              <span className="text-ash block">Övertid</span>
              <span className="font-medium text-lg text-terracotta">
                {status.overtimeHours} tim
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-sand text-xs text-ash">
          {Math.round(status.percentUsed)}% av inkluderade timmar förbrukade
        </div>
      </CardContent>
    </Card>
  );
}
