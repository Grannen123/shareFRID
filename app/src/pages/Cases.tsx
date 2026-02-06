import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Filter, MoreHorizontal, Clock } from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatRelativeDate, formatDuration } from "@/lib/utils";
import type { Case, CaseStatus } from "@/types";

// Mock data - replace with React Query hooks
const mockCases: Case[] = [
  {
    id: "1",
    caseNumber: "C-26-047",
    customerId: "1",
    agreementId: "1",
    billingContactId: null,
    title: "Störning Lindqvist - lgh 302",
    type: "case",
    status: "active",
    priority: "high",
    assigneeId: null,
    description:
      "Upprepade störningar kvällstid, grannar klagat sedan januari.",
    deadline: new Date(Date.now() + 604800000).toISOString(),
    closedAt: null,
    closedReason: null,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: {
      id: "1",
      fortnoxNumber: "10234",
      name: "BRF Solbacken",
      orgNumber: "769612-3456",
      status: "active",
      workspace: "goteborg",
      address: null,
      postalCode: null,
      city: null,
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: "2",
    caseNumber: "C-26-046",
    customerId: "2",
    agreementId: "2",
    billingContactId: null,
    title: "Otillåten andrahandsuthyrning - lgh 105",
    type: "case",
    status: "active",
    priority: "medium",
    assigneeId: null,
    description: "Misstänkt otillåten andrahandsuthyrning via Airbnb.",
    deadline: new Date(Date.now() + 1209600000).toISOString(),
    closedAt: null,
    closedReason: null,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    customer: {
      id: "2",
      fortnoxNumber: "10235",
      name: "BRF Havsutsikten",
      orgNumber: "769612-7890",
      status: "active",
      workspace: "goteborg",
      address: null,
      postalCode: null,
      city: null,
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: "3",
    caseNumber: "P-26-008",
    customerId: "3",
    agreementId: "3",
    billingContactId: null,
    title: "Revision av trivselregler",
    type: "project",
    status: "active",
    priority: "low",
    assigneeId: null,
    description: "Genomgång och uppdatering av föreningens trivselregler.",
    deadline: new Date(Date.now() + 2592000000).toISOString(),
    closedAt: null,
    closedReason: null,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    customer: {
      id: "3",
      fortnoxNumber: "10240",
      name: "HSB Kungsbacka",
      orgNumber: "769612-1234",
      status: "active",
      workspace: "goteborg",
      address: null,
      postalCode: null,
      city: null,
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: "4",
    caseNumber: "C-26-040",
    customerId: "1",
    agreementId: "1",
    billingContactId: null,
    title: "Vattenläcka - lgh 201",
    type: "case",
    status: "closed",
    priority: "high",
    assigneeId: null,
    description: "Akut vattenläcka hanterad tillsammans med försäkringsbolag.",
    deadline: null,
    closedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    closedReason: "Ärendet löst - försäkringsskada reglerad",
    createdAt: new Date(Date.now() - 86400000 * 21).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    customer: {
      id: "1",
      fortnoxNumber: "10234",
      name: "BRF Solbacken",
      orgNumber: "769612-3456",
      status: "active",
      workspace: "goteborg",
      address: null,
      postalCode: null,
      city: null,
      ownerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

// Mock time tracking data
const mockTimeTracking: Record<string, number> = {
  "1": 180, // 3 hours
  "2": 90, // 1.5 hours
  "3": 240, // 4 hours
  "4": 360, // 6 hours
};

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "error" as const,
};

function CaseCard({
  caseItem,
  onClick,
}: {
  caseItem: Case;
  onClick: () => void;
}) {
  const statusColor = STATUS_COLORS.caseStatus[caseItem.status];
  const timeSpent = mockTimeTracking[caseItem.id] || 0;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-gray-500">
                {caseItem.caseNumber}
              </span>
              <Badge variant={statusColor as "success" | "warning" | "default"}>
                {LABELS.caseStatuses[caseItem.status]}
              </Badge>
              <Badge variant={priorityColors[caseItem.priority]}>
                {LABELS.priorities[caseItem.priority]}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900">{caseItem.title}</h3>
            <p className="text-sm text-gray-500">{caseItem.customer?.name}</p>
            {caseItem.description && (
              <p className="text-sm text-gray-500 line-clamp-2">
                {caseItem.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(timeSpent)}
              </span>
              <span>Uppdaterad {formatRelativeDate(caseItem.updatedAt)}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => toast.info("Visa detaljer kommer snart!")}
              >
                Visa detaljer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Journal kommer snart!")}
              >
                Lägg till journal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Redigera kommer snart!")}
              >
                Redigera
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {caseItem.status !== "closed" && (
                <DropdownMenuItem
                  onClick={() => toast.info("Avsluta ärende kommer snart!")}
                >
                  Avsluta ärende
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function Cases() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">(
    "active",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCases = mockCases.filter((caseItem) => {
    const matchesStatus =
      statusFilter === "all" || caseItem.status === statusFilter;
    const matchesSearch =
      caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const casesCount = mockCases.filter((c) => c.type === "case").length;
  const projectsCount = mockCases.filter((c) => c.type === "project").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ärenden</h1>
          <p className="text-gray-500">
            {casesCount} ärenden, {projectsCount} projekt
          </p>
        </div>
        <Button onClick={() => toast.info("Skapa ärende kommer snart!")}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt ärende
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as CaseStatus | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">Alla</TabsTrigger>
            <TabsTrigger value="active">Pågående</TabsTrigger>
            <TabsTrigger value="paused">Pausade</TabsTrigger>
            <TabsTrigger value="closed">Avslutade</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Sök ärende..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kunder</SelectItem>
              <SelectItem value="1">BRF Solbacken</SelectItem>
              <SelectItem value="2">BRF Havsutsikten</SelectItem>
              <SelectItem value="3">HSB Kungsbacka</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toast.info("Filter kommer snart!")}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredCases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            caseItem={caseItem}
            onClick={() => navigate(`/arenden/${caseItem.id}`)}
          />
        ))}
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{LABELS.emptyStates.noCases}</p>
        </div>
      )}
    </div>
  );
}
