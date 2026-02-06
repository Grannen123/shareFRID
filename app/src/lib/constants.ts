// Swedish labels and constants for Grannfrid CRM

export const LABELS = {
  // Navigation
  dashboard: "Översikt",
  customers: "Kunder",
  cases: "Ärenden",
  projects: "Projekt",
  assignments: "Uppdrag",
  workspace: "Arbetsyta",
  billing: "Fakturering",
  knowledge: "Kunskapsbank",
  intranet: "Intranät",
  company: "Grannfrid AB",
  settings: "Inställningar",

  // Entities
  customer: "Kund",
  contact: "Kontakt",
  agreement: "Avtal",
  case: "Ärende",
  project: "Projekt",
  journal: "Journal",
  invoice: "Faktura",
  task: "Uppgift",

  // Agreement types
  agreementTypes: {
    hourly: "Löpande",
    timebank: "Timbank",
    fixed: "Fastpris",
    onetime: "Engångsbelopp",
  } as const,

  // Customer statuses
  customerStatuses: {
    active: "Aktiv",
    prospekt: "Prospekt",
    vilande: "Vilande",
  } as const,

  // Case statuses
  caseStatuses: {
    active: "Pågående",
    paused: "Pausat",
    closed: "Avslutat",
  } as const,

  // Priorities
  priorities: {
    low: "Låg",
    medium: "Medium",
    high: "Hög",
  } as const,

  // Journal entry types
  journalEntryTypes: {
    call: "Samtal",
    email: "Mail",
    meeting: "Möte",
    visit: "Besök",
    letter: "Brev",
    admin: "Administration",
    other: "Övrigt",
  } as const,

  // Billing types
  billingTypes: {
    included: "Ingår",
    extra: "Extraarbete",
    non_billable: "Ej fakturerbart",
  } as const,

  // Billing statuses
  billingStatuses: {
    pending: "Väntar",
    review: "Granskas",
    approved: "Godkänd",
    invoiced: "Fakturerad",
  } as const,

  // Invoice statuses
  invoiceStatuses: {
    draft: "Utkast",
    sent: "Skickad",
    paid: "Betald",
    cancelled: "Makulerad",
  } as const,

  // Task statuses
  taskStatuses: {
    pending: "Att göra",
    in_progress: "Pågående",
    done: "Klar",
  } as const,

  // Workspaces
  workspaces: {
    goteborg: "Göteborg",
    stockholm: "Stockholm",
  } as const,

  // Time units
  timeUnits: {
    minutes: "minuter",
    hours: "timmar",
    days: "dagar",
  } as const,

  // Actions
  actions: {
    create: "Skapa",
    edit: "Redigera",
    delete: "Ta bort",
    save: "Spara",
    cancel: "Avbryt",
    close: "Stäng",
    open: "Öppna",
    search: "Sök",
    filter: "Filtrera",
    export: "Exportera",
    import: "Importera",
  } as const,

  // Confirmations
  confirmations: {
    delete: "Är du säker på att du vill ta bort?",
    unsavedChanges: "Du har osparade ändringar. Vill du verkligen lämna?",
    closeCase: "Vill du avsluta ärendet?",
  } as const,

  // Errors
  errors: {
    generic: "Ett fel uppstod. Försök igen.",
    notFound: "Kunde inte hittas.",
    unauthorized: "Du har inte behörighet.",
    validation: "Kontrollera att alla fält är korrekt ifyllda.",
  } as const,

  // Empty states
  emptyStates: {
    noCustomers: "Inga kunder hittades",
    noCases: "Inga ärenden hittades",
    noTasks: "Inga uppgifter",
    noJournalEntries: "Inga journalanteckningar",
    noResults: "Inga resultat",
  } as const,
} as const;

// Status colors for badges
export const STATUS_COLORS = {
  customerStatus: {
    active: "success",
    prospekt: "info",
    vilande: "gray",
  },
  caseStatus: {
    active: "success",
    paused: "warning",
    closed: "gray",
  },
  priority: {
    low: "gray",
    medium: "warning",
    high: "error",
  },
  billingStatus: {
    pending: "gray",
    review: "warning",
    approved: "success",
    invoiced: "info",
  },
  taskStatus: {
    pending: "gray",
    in_progress: "warning",
    done: "success",
  },
} as const;

// Navigation items
export const NAV_ITEMS = [
  { label: LABELS.dashboard, path: "/", icon: "LayoutDashboard" },
  { label: LABELS.customers, path: "/kunder", icon: "Building2" },
  { label: LABELS.assignments, path: "/arenden", icon: "FileText" },
  { label: LABELS.workspace, path: "/arbetsyta", icon: "CheckSquare" },
  { label: LABELS.billing, path: "/fakturering", icon: "Receipt" },
  { label: LABELS.knowledge, path: "/kunskapsbank", icon: "BookOpen" },
  { label: LABELS.intranet, path: "/intranat", icon: "Globe" },
] as const;

// Workspace tabs for customers
export const WORKSPACE_TABS = [
  { value: "goteborg", label: LABELS.workspaces.goteborg },
  { value: "stockholm", label: LABELS.workspaces.stockholm },
] as const;
