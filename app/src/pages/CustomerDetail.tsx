/**
 * Customer Detail Page
 */

import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Plus,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatRelativeDate, formatCurrency } from "@/lib/utils";
import type { Customer, Contact, Agreement, Case } from "@/types";

// Mock data
const mockCustomer: Customer & {
  contacts: Contact[];
  agreements: Agreement[];
  cases: Case[];
} = {
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
  createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
  updatedAt: new Date().toISOString(),
  contacts: [
    {
      id: "1",
      customerId: "1",
      name: "Anders Karlsson",
      role: "Styrelseordförande",
      email: "anders.karlsson@brfsolbacken.se",
      phone: "070-123 45 67",
      isPrimary: true,
      isBillingContact: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      customerId: "1",
      name: "Maria Lindberg",
      role: "Kassör",
      email: "maria.lindberg@brfsolbacken.se",
      phone: "070-234 56 78",
      isPrimary: false,
      isBillingContact: false,
      createdAt: new Date().toISOString(),
    },
  ],
  agreements: [
    {
      id: "1",
      customerId: "1",
      type: "timebank",
      name: "Timbank 2026",
      hourlyRate: 1100,
      overtimeRate: 1200,
      fixedAmount: null,
      includedMinutes: 600,
      usedMinutes: 420,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  cases: [
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
      description: "Upprepade störningar kvällstid.",
      deadline: new Date(Date.now() + 604800000).toISOString(),
      closedAt: null,
      closedReason: null,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date().toISOString(),
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
      description: "Akut vattenläcka hanterad.",
      deadline: null,
      closedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      closedReason: "Ärendet löst",
      createdAt: new Date(Date.now() - 86400000 * 21).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
};

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // In real app, fetch customer by id
  const customer = mockCustomer;

  const activeAgreement = customer.agreements.find(
    (a) => a.status === "active",
  );
  const activeCases = customer.cases.filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/kunder")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {customer.name}
            </h1>
            <Badge
              variant={
                STATUS_COLORS.customerStatus[customer.status] as
                  | "success"
                  | "info"
                  | "default"
              }
            >
              {LABELS.customerStatuses[customer.status]}
            </Badge>
          </div>
          <p className="text-gray-500">
            Fortnox: {customer.fortnoxNumber} | Org.nr: {customer.orgNumber}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => toast.info("Redigera kommer snart!")}
        >
          <Edit className="mr-2 h-4 w-4" />
          Redigera
        </Button>
        <Button onClick={() => toast.info("Nytt ärende kommer snart!")}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt ärende
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.length}</p>
                <p className="text-sm text-gray-500">Aktiva ärenden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                {activeAgreement ? (
                  <>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        ((activeAgreement.includedMinutes! -
                          activeAgreement.usedMinutes) /
                          60) *
                          10,
                      ) / 10}
                      h
                    </p>
                    <p className="text-sm text-gray-500">Kvar i timbank</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-sm text-gray-500">Inget avtal</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customer.contacts.length}</p>
                <p className="text-sm text-gray-500">Kontaktpersoner</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{customer.city}</p>
                <p className="text-sm text-gray-500">
                  {LABELS.workspaces[customer.workspace]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="cases">
            Ärenden ({customer.cases.length})
          </TabsTrigger>
          <TabsTrigger value="agreements">
            Avtal ({customer.agreements.length})
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Kontakter ({customer.contacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Kontaktinformation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{customer.address}</p>
                    <p className="text-sm text-gray-500">
                      {customer.postalCode} {customer.city}
                    </p>
                  </div>
                </div>
                {customer.contacts[0] && (
                  <>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {customer.contacts[0].phone}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.contacts[0].name} (
                          {customer.contacts[0].role})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <p className="font-medium">
                        {customer.contacts[0].email}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Active Agreement */}
            <Card>
              <CardHeader>
                <CardTitle>Aktivt avtal</CardTitle>
              </CardHeader>
              <CardContent>
                {activeAgreement ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {activeAgreement.name}
                      </span>
                      <Badge variant="success">Aktivt</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Typ</span>
                        <span>
                          {LABELS.agreementTypes[activeAgreement.type]}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Timpris</span>
                        <span>
                          {formatCurrency(activeAgreement.hourlyRate || 0)}/h
                        </span>
                      </div>
                      {activeAgreement.type === "timebank" && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Timbank</span>
                            <span>
                              {Math.round(activeAgreement.usedMinutes / 60)}h /{" "}
                              {Math.round(
                                activeAgreement.includedMinutes! / 60,
                              )}
                              h
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500"
                              style={{
                                width: `${(activeAgreement.usedMinutes / activeAgreement.includedMinutes!) * 100}%`,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Inget aktivt avtal</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Senaste ärenden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customer.cases.slice(0, 3).map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/arenden/${caseItem.id}`)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">
                          {caseItem.caseNumber}
                        </span>
                        <Badge
                          variant={
                            STATUS_COLORS.caseStatus[caseItem.status] as
                              | "success"
                              | "warning"
                              | "default"
                          }
                        >
                          {LABELS.caseStatuses[caseItem.status]}
                        </Badge>
                      </div>
                      <p className="font-medium mt-1">{caseItem.title}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatRelativeDate(caseItem.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {customer.cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/arenden/${caseItem.id}`)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">
                          {caseItem.caseNumber}
                        </span>
                        <Badge
                          variant={
                            STATUS_COLORS.caseStatus[caseItem.status] as
                              | "success"
                              | "warning"
                              | "default"
                          }
                        >
                          {LABELS.caseStatuses[caseItem.status]}
                        </Badge>
                      </div>
                      <p className="font-medium mt-1">{caseItem.title}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatRelativeDate(caseItem.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agreements" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {customer.agreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agreement.name}</span>
                        <Badge
                          variant={
                            agreement.status === "active"
                              ? "success"
                              : "default"
                          }
                        >
                          {agreement.status === "active"
                            ? "Aktivt"
                            : "Avslutat"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {LABELS.agreementTypes[agreement.type]} |{" "}
                        {agreement.validFrom} -{" "}
                        {agreement.validTo || "tillsvidare"}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(agreement.hourlyRate || 0)}/h
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {customer.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        {contact.isPrimary && (
                          <Badge variant="info">Primär</Badge>
                        )}
                        {contact.isBillingContact && (
                          <Badge variant="warning">Faktura</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {contact.role}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{contact.email}</p>
                      <p className="text-gray-500">{contact.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
