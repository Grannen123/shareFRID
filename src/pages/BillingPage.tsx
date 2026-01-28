import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { BillingPeriodSummary } from "@/features/billing/BillingPeriodSummary";
import { BillingBatchList } from "@/features/billing/BillingBatchList";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

export function BillingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <AppShell title="Fakturering">
      <div className="space-y-6">
        {/* Period selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-2xl font-display font-bold text-charcoal">
                  {MONTH_NAMES[month - 1]} {year}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main content tabs */}
        <Tabs defaultValue="unbilled">
          <TabsList>
            <TabsTrigger value="unbilled">Oexporterade</TabsTrigger>
            <TabsTrigger value="batches">Fakturaunderlag</TabsTrigger>
          </TabsList>

          <TabsContent value="unbilled" className="mt-4">
            <BillingPeriodSummary year={year} month={month} />
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            <BillingBatchList year={year} month={month} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
