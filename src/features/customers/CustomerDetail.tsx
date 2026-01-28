import { useEffect, useState } from "react";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import {
  Pencil,
  FileText,
  Clock,
  Users,
  MessageSquare,
  CheckSquare,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import {
  useCustomerAgreement,
  useDeleteAgreement,
} from "@/hooks/useAgreements";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  AGREEMENT_TYPE_LABELS,
} from "@/lib/constants";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { CustomerForm } from "./CustomerForm";
import { AgreementForm } from "./AgreementForm";
import { CustomerNotesTab } from "./CustomerNotesTab";
import { CustomerAssignmentsTab } from "./CustomerAssignmentsTab";
import { CustomerContactsTab } from "./CustomerContactsTab";
import { CustomerTasksTab } from "./CustomerTasksTab";
import { TimebankWidget } from "./TimebankWidget";
import { FilesTab } from "@/features/files/FilesTab";
import { CustomerTimeline } from "./CustomerTimeline";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CustomerFormData } from "@/lib/schemas";
import type { Agreement } from "@/types/database";

const statusVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  active: "sage",
  prospekt: "outline",
  vilande: "terracotta",
};

export function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomer(customerId!);
  const { data: agreement, isLoading: agreementLoading } = useCustomerAgreement(
    customerId!,
  );
  const updateCustomer = useUpdateCustomer();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteAgreementConfirm, setDeleteAgreementConfirm] =
    useState<Agreement | null>(null);
  const deleteAgreement = useDeleteAgreement();

  const breadcrumbs = [
    { label: "Kunder", href: "/customers" },
    { label: customer?.name || "Laddar..." },
  ];

  if (isLoading) {
    return (
      <AppShell title="Laddar...">
        <div className="space-y-6">
          <Breadcrumbs items={breadcrumbs} />
          <SkeletonCard hasHeader lines={4} />
          <div className="grid md:grid-cols-2 gap-6">
            <SkeletonCard hasHeader lines={5} />
            <SkeletonCard hasHeader lines={5} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !customer) {
    return (
      <AppShell title="Kund hittades inte">
        <div className="space-y-6">
          <Breadcrumbs
            items={[
              { label: "Kunder", href: "/customers" },
              { label: "Hittades inte" },
            ]}
          />
          <div className="text-center py-12">
            <p className="text-terracotta mb-4">Kunde inte hitta kunden</p>
            <Button onClick={() => navigate("/customers")}>
              Tillbaka till kunder
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleUpdateCustomer = async (data: CustomerFormData) => {
    await updateCustomer.mutateAsync({ id: customer.id, ...data });
    setShowEditForm(false);
  };

  const OpenEditAndRedirect = () => {
    useEffect(() => {
      setShowEditForm(true);
      navigate(`/customers/${customer.id}`, { replace: true });
    }, [customer.id, navigate]);

    return null;
  };

  return (
    <AppShell title={customer.name}>
      <Routes>
        <Route
          index
          element={
            <div className="space-y-6">
              <Breadcrumbs items={breadcrumbs} />
              {/* Header med kundinfo */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">
                        {customer.name}
                      </CardTitle>
                      <Badge variant={statusVariants[customer.status]}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </Badge>
                    </div>
                    <CardDescription className="space-y-1">
                      <div>{customer.customer_number}</div>
                      {customer.org_number && (
                        <div>Org.nr: {customer.org_number}</div>
                      )}
                      {customer.customer_type && (
                        <div>
                          {CUSTOMER_TYPE_LABELS[customer.customer_type]}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditForm(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Redigera
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {customer.email && (
                      <div>
                        <span className="text-ash">E-post</span>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    )}
                    {customer.phone && (
                      <div>
                        <span className="text-ash">Telefon</span>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    )}
                    {customer.address && (
                      <div>
                        <span className="text-ash">Adress</span>
                        <p className="font-medium whitespace-pre-line">
                          {customer.address}
                        </p>
                      </div>
                    )}
                    {customer.antal_lagenheter && (
                      <div>
                        <span className="text-ash">Antal lägenheter</span>
                        <p className="font-medium">
                          {customer.antal_lagenheter}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Avtal och timbank */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Avtal</CardTitle>
                      {agreement && (
                        <CardDescription>
                          {AGREEMENT_TYPE_LABELS[agreement.type]}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {agreement && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteAgreementConfirm(agreement)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAgreementForm(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {agreement ? "Redigera" : "Skapa avtal"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agreementLoading ? (
                      <div className="text-ash">Laddar...</div>
                    ) : agreement ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-ash">Timpris</span>
                          <span className="font-medium">
                            {agreement.hourly_rate} kr/h
                          </span>
                        </div>
                        {agreement.overtime_rate && (
                          <div className="flex justify-between">
                            <span className="text-ash">Övertidspris</span>
                            <span className="font-medium">
                              {agreement.overtime_rate} kr/h
                            </span>
                          </div>
                        )}
                        {agreement.included_hours && (
                          <div className="flex justify-between">
                            <span className="text-ash">Inkluderade timmar</span>
                            <span className="font-medium">
                              {agreement.included_hours} h/
                              {agreement.period === "monthly" ? "mån" : "år"}
                            </span>
                          </div>
                        )}
                        {agreement.fixed_amount && (
                          <div className="flex justify-between">
                            <span className="text-ash">Fast belopp</span>
                            <span className="font-medium">
                              {agreement.fixed_amount} kr/
                              {agreement.period === "monthly" ? "mån" : "år"}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-ash">Giltig från</span>
                          <span className="font-medium">
                            {new Date(agreement.valid_from).toLocaleDateString(
                              "sv-SE",
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-ash">
                        Inget avtal kopplat till denna kund.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Timbank widget (bara för timebank-avtal) */}
                {agreement?.type === "timebank" && (
                  <TimebankWidget
                    agreementId={agreement.id}
                    customerId={customer.id}
                  />
                )}
              </div>

              {/* Tabs för uppdrag, anteckningar, kontakter etc */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">
                    <Clock className="h-4 w-4 mr-2" />
                    Senaste aktivitet
                  </TabsTrigger>
                  <TabsTrigger value="assignments">
                    <FileText className="h-4 w-4 mr-2" />
                    Uppdrag
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Uppgifter
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Anteckningar
                  </TabsTrigger>
                  <TabsTrigger value="contacts">
                    <Users className="h-4 w-4 mr-2" />
                    Kontakter
                  </TabsTrigger>
                  <TabsTrigger value="files">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Filer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <CustomerTimeline customerId={customer.id} />
                </TabsContent>

                <TabsContent value="assignments" className="mt-4">
                  <CustomerAssignmentsTab customerId={customer.id} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <CustomerTasksTab customerId={customer.id} />
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <CustomerNotesTab customerId={customer.id} />
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                  <CustomerContactsTab customerId={customer.id} />
                </TabsContent>

                <TabsContent value="files" className="mt-4">
                  <FilesTab customerId={customer.id} />
                </TabsContent>
              </Tabs>
            </div>
          }
        />
        <Route path="edit" element={<OpenEditAndRedirect />} />
      </Routes>

      <CustomerForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSubmit={handleUpdateCustomer}
        isLoading={updateCustomer.isPending}
        defaultValues={customer}
        mode="edit"
      />

      <AgreementForm
        open={showAgreementForm}
        onOpenChange={setShowAgreementForm}
        customerId={customer.id}
        existingAgreement={agreement || undefined}
      />

      <ConfirmDialog
        open={!!deleteAgreementConfirm}
        onOpenChange={(open) => !open && setDeleteAgreementConfirm(null)}
        title="Ta bort avtal"
        description={`Är du säker på att du vill ta bort avtalet för ${customer.name}? Detta kan inte ångras.`}
        confirmLabel="Ta bort"
        variant="danger"
        isLoading={deleteAgreement.isPending}
        onConfirm={async () => {
          if (deleteAgreementConfirm) {
            await deleteAgreement.mutateAsync(deleteAgreementConfirm);
            setDeleteAgreementConfirm(null);
          }
        }}
      />
    </AppShell>
  );
}
