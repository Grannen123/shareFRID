export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    detail: (id: string) => ['customers', id] as const,
    byWorkspace: (wsId: string) => ['customers', 'workspace', wsId] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    detail: (id: string) => ['assignments', id] as const,
    byCustomer: (customerId: string) => ['assignments', 'customer', customerId] as const,
  },
  journal: {
    byAssignment: (assignmentId: string) => ['journal', assignmentId] as const,
  },
  timeEntries: {
    all: ['timeEntries'] as const,
    byCustomer: (customerId: string) => ['timeEntries', 'customer', customerId] as const,
    byPeriod: (year: number, month: number) => ['timeEntries', 'period', year, month] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byAssignee: (userId: string) => ['tasks', 'assignee', userId] as const,
  },
  agreements: {
    all: ['agreements'] as const,
    byCustomer: (customerId: string) => ['agreements', 'customer', customerId] as const,
    withIndexation: ['agreements', 'indexation'] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    byCustomer: (customerId: string) => ['contacts', 'customer', customerId] as const,
  },
  knowledge: {
    all: ['knowledge'] as const,
    byCategory: (category: string) => ['knowledge', 'category', category] as const,
  },
  profile: {
    current: ['profile', 'current'] as const,
  },
  customerNotes: {
    byCustomer: (customerId: string) => ['customerNotes', customerId] as const,
  },
  quickNotes: {
    all: ['quickNotes'] as const,
  },
  billingBatches: {
    all: ['billingBatches'] as const,
    byCustomer: (customerId: string) => ['billingBatches', customerId] as const,
    byPeriod: (year: number, month: number) => ['billingBatches', 'period', year, month] as const,
  },
  timebankStatus: {
    byAgreement: (agreementId: string) => ['timebankStatus', agreementId] as const,
    byCustomer: (customerId: string) => ['timebankStatus', 'customer', customerId] as const,
  },
} as const;
