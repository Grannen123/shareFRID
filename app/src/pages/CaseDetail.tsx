/**
 * Case/Assignment Detail Page
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Building2,
  Plus,
  Edit,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
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
  Textarea,
} from "@/components/ui";
import { LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatRelativeDate, formatDuration, formatDate } from "@/lib/utils";
import type { Case, JournalEntry } from "@/types";

// Mock case data
const mockCase: Case & { journalEntries: JournalEntry[] } = {
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
    "Upprepade störningar kvällstid, grannar klagat sedan januari. Boende i lgh 302 spelar hög musik efter kl 22. Flera grannar har klagat via mail och telefon. Styrelsen har bett oss hantera ärendet.",
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
    address: "Solbackevägen 12",
    postalCode: "41257",
    city: "Göteborg",
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  journalEntries: [
    {
      id: "1",
      caseId: "1",
      entryDate: new Date().toISOString(),
      entryType: "call",
      minutes: 30,
      description:
        "Samtal med styrelseordförande Anders Karlsson. Diskuterade ärendet och beslutade att skicka första varningsbrev till lgh 302.",
      invoiceText: "Telefonsamtal ang störning",
      billingType: "included",
      consultantId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      caseId: "1",
      entryDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      entryType: "admin",
      minutes: 45,
      description:
        "Upprättat varningsbrev enligt mall. Brevet skickas med rekommenderat brev imorgon.",
      invoiceText: "Administration - varningsbrev",
      billingType: "included",
      consultantId: null,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "3",
      caseId: "1",
      entryDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      entryType: "email",
      minutes: 15,
      description:
        "Mottagit klagomål via mail från granne i lgh 304. Bekräftat mottagande och informerat om pågående hantering.",
      invoiceText: null,
      billingType: "included",
      consultantId: null,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
};

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "error" as const,
};

const entryTypeIcons: Record<string, typeof MessageSquare> = {
  call: MessageSquare,
  email: FileText,
  meeting: User,
  admin: Clock,
};

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");

  // In real app, fetch case by id
  const caseData = mockCase;

  const totalMinutes = caseData.journalEntries.reduce(
    (sum, entry) => sum + entry.minutes,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/arenden")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-gray-500">
              {caseData.caseNumber}
            </span>
            <Badge
              variant={
                STATUS_COLORS.caseStatus[caseData.status] as
                  | "success"
                  | "warning"
                  | "default"
              }
            >
              {LABELS.caseStatuses[caseData.status]}
            </Badge>
            <Badge variant={priorityColors[caseData.priority]}>
              {LABELS.priorities[caseData.priority]}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">
            {caseData.title}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => toast.info("Redigera kommer snart!")}
        >
          <Edit className="mr-2 h-4 w-4" />
          Redigera
        </Button>
        {caseData.status !== "closed" && (
          <Button
            variant="outline"
            onClick={() => toast.info("Avsluta ärende kommer snart!")}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Avsluta
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p
                  className="font-medium text-blue-600 cursor-pointer hover:underline"
                  onClick={() => navigate(`/kunder/${caseData.customerId}`)}
                >
                  {caseData.customer?.name}
                </p>
                <p className="text-sm text-gray-500">Kund</p>
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
                <p className="text-2xl font-bold">
                  {formatDuration(totalMinutes)}
                </p>
                <p className="text-sm text-gray-500">Total tid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {caseData.journalEntries.length}
                </p>
                <p className="text-sm text-gray-500">Journalposter</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${
                  caseData.deadline && new Date(caseData.deadline) < new Date()
                    ? "bg-red-100"
                    : "bg-orange-100"
                }`}
              >
                <Calendar
                  className={`h-5 w-5 ${
                    caseData.deadline &&
                    new Date(caseData.deadline) < new Date()
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-medium">
                  {caseData.deadline
                    ? formatDate(caseData.deadline)
                    : "Ingen deadline"}
                </p>
                <p className="text-sm text-gray-500">Deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal">
            Journal ({caseData.journalEntries.length})
          </TabsTrigger>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="documents">Dokument</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-6 space-y-6">
          {/* Quick add */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Textarea
                  placeholder="Lägg till en snabb anteckning..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast.info("Fullständig journal kommer snart!")
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ny journalpost
                  </Button>
                  <Button
                    disabled={!newNote.trim()}
                    onClick={() => {
                      toast.success("Anteckning sparad!");
                      setNewNote("");
                    }}
                  >
                    Spara anteckning
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journal entries */}
          <div className="space-y-4">
            {caseData.journalEntries.map((entry) => {
              const Icon = entryTypeIcons[entry.entryType] || MessageSquare;
              return (
                <Card key={entry.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="rounded-lg bg-gray-100 p-2 h-fit">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatDate(entry.entryDate)}
                            </span>
                            <Badge variant="outline">
                              {LABELS.entryTypes[entry.entryType]}
                            </Badge>
                            <Badge variant="default">
                              {formatDuration(entry.minutes)}
                            </Badge>
                          </div>
                          <Badge
                            variant={
                              entry.billingType === "extra"
                                ? "warning"
                                : "default"
                            }
                          >
                            {LABELS.billingTypes[entry.billingType]}
                          </Badge>
                        </div>
                        <p className="text-gray-700">{entry.description}</p>
                        {entry.invoiceText && (
                          <p className="text-sm text-gray-500 italic">
                            Fakturatext: {entry.invoiceText}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Beskrivning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {caseData.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ärendetyp</span>
                  <span>{caseData.type === "case" ? "Ärende" : "Projekt"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prioritet</span>
                  <Badge variant={priorityColors[caseData.priority]}>
                    {LABELS.priorities[caseData.priority]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Skapad</span>
                  <span>{formatDate(caseData.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Senast uppdaterad</span>
                  <span>{formatRelativeDate(caseData.updatedAt)}</span>
                </div>
                {caseData.deadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deadline</span>
                    <span>{formatDate(caseData.deadline)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Inga dokument ännu</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => toast.info("Ladda upp dokument kommer snart!")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ladda upp dokument
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
