/**
 * Centraliserade React Query cache-nycklar för hela applikationen.
 * Använd ALLTID dessa nycklar för att säkerställa korrekt cache-invalidering.
 *
 * @example
 * // Hämta alla kunder
 * useQuery({ queryKey: queryKeys.customers.all, queryFn: ... })
 *
 * // Invalidera en specifik kund
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) })
 */
export const queryKeys = {
  customers: {
    all: ["customers"] as const,
    detail: (id: string) => ["customers", id] as const,
    byWorkspace: (wsId: string) => ["customers", "workspace", wsId] as const,
    paged: (page: number, pageSize: number, search: string) =>
      ["customers", "page", page, pageSize, search] as const,
    timeline: (customerId: string) =>
      ["customers", customerId, "timeline"] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    detail: (id: string) => ["assignments", id] as const,
    byCustomer: (customerId: string) =>
      ["assignments", "customer", customerId] as const,
  },
  journal: {
    byAssignment: (assignmentId: string) => ["journal", assignmentId] as const,
  },
  timeEntries: {
    all: ["timeEntries"] as const,
    byCustomer: (customerId: string) =>
      ["timeEntries", "customer", customerId] as const,
    byPeriod: (year: number, month: number) =>
      ["timeEntries", "period", year, month] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    byAssignee: (userId: string) => ["tasks", "assignee", userId] as const,
    byCustomer: (customerId: string) =>
      ["tasks", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["tasks", "assignment", assignmentId] as const,
  },
  agreements: {
    all: ["agreements"] as const,
    byCustomer: (customerId: string) =>
      ["agreements", "customer", customerId] as const,
    withIndexation: ["agreements", "indexation"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    byCustomer: (customerId: string) =>
      ["contacts", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["contacts", "assignment", assignmentId] as const,
  },
  knowledge: {
    all: ["knowledge"] as const,
    byCategory: (category: string) =>
      ["knowledge", "category", category] as const,
  },
  profile: {
    current: ["profile", "current"] as const,
  },
  customerNotes: {
    byCustomer: (customerId: string) => ["customerNotes", customerId] as const,
  },
  notes: {
    all: ["notes"] as const,
  },
  quickNotes: {
    all: ["quickNotes"] as const,
  },
  files: {
    byCustomer: (customerId: string) =>
      ["files", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["files", "assignment", assignmentId] as const,
  },
  billingBatches: {
    all: ["billingBatches"] as const,
    detail: (id: string) => ["billingBatches", id] as const,
    byCustomer: (customerId: string) => ["billingBatches", customerId] as const,
    byPeriod: (year: number, month: number) =>
      ["billingBatches", "period", year, month] as const,
  },
  timebankStatus: {
    byAgreement: (agreementId: string) =>
      ["timebankStatus", agreementId] as const,
    byCustomer: (customerId: string) =>
      ["timebankStatus", "customer", customerId] as const,
  },
  timebank: {
    status: (agreementId: string) =>
      ["timebank", "status", agreementId] as const,
  },
} as const;
