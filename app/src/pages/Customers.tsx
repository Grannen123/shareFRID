import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui";
import { LABELS, STATUS_COLORS } from "@/lib/constants";
import type { Customer, Workspace } from "@/types";

// Mock data - replace with React Query hooks
const mockCustomers: Customer[] = [
  {
    id: "1",
    fortnoxNumber: "10234",
    name: "BRF Solbacken",
    orgNumber: "769612-3456",
    status: "active",
    workspace: "goteborg",
    address: "Solbackevägen 12",
    postalCode: "41257",
    city: "Göteborg",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    fortnoxNumber: "10235",
    name: "BRF Havsutsikten",
    orgNumber: "769612-7890",
    status: "active",
    workspace: "goteborg",
    address: "Havsvägen 45",
    postalCode: "41301",
    city: "Göteborg",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    fortnoxNumber: "10240",
    name: "HSB Kungsbacka",
    orgNumber: "769612-1234",
    status: "active",
    workspace: "goteborg",
    address: "Kungsgatan 10",
    postalCode: "43430",
    city: "Kungsbacka",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    fortnoxNumber: "20100",
    name: "BRF Södermalm",
    orgNumber: "769612-5678",
    status: "active",
    workspace: "stockholm",
    address: "Götgatan 100",
    postalCode: "11862",
    city: "Stockholm",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    fortnoxNumber: "20105",
    name: "Fastighets AB Centrum",
    orgNumber: "556789-1234",
    status: "prospekt",
    workspace: "stockholm",
    address: "Sveavägen 50",
    postalCode: "11134",
    city: "Stockholm",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function CustomerCard({ customer }: { customer: Customer }) {
  const statusColor = STATUS_COLORS.customerStatus[customer.status];

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{customer.name}</h3>
              <Badge variant={statusColor as "success" | "info" | "default"}>
                {LABELS.customerStatuses[customer.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Fortnox: {customer.fortnoxNumber}
              {customer.orgNumber && ` | Org.nr: ${customer.orgNumber}`}
            </p>
            <p className="text-sm text-gray-500">
              {customer.address}, {customer.postalCode} {customer.city}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Visa detaljer</DropdownMenuItem>
              <DropdownMenuItem>Redigera</DropdownMenuItem>
              <DropdownMenuItem>Nytt ärende</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function Customers() {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("goteborg");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      customer.workspace === activeWorkspace &&
      (customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.fortnoxNumber.includes(searchQuery)),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kunder</h1>
          <p className="text-gray-500">Hantera kunder och avtal</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ny kund
        </Button>
      </div>

      {/* Workspace Tabs */}
      <Tabs
        value={activeWorkspace}
        onValueChange={(v) => setActiveWorkspace(v as Workspace)}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="goteborg">
              {LABELS.workspaces.goteborg}
            </TabsTrigger>
            <TabsTrigger value="stockholm">
              {LABELS.workspaces.stockholm}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Sök kund..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="goteborg" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{LABELS.emptyStates.noCustomers}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stockholm" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{LABELS.emptyStates.noCustomers}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
