// Svenska labels för UI

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  brf: "Bostadsrättsförening",
  kommunalt_fastighetsbolag: "Kommunalt fastighetsbolag",
  privat_fastighetsbolag: "Privat fastighetsbolag",
  forvaltningsbolag: "Förvaltningsbolag",
  stiftelse: "Stiftelse",
  samfallighet: "Samfällighet",
  ovrig: "Övrig",
};

export const FILES_BUCKET = "files";

// Filuppladdningsbegränsningar
export const FILE_UPLOAD_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
export const FILE_UPLOAD_MAX_SIZE_LABEL = "25 MB";

export const FILE_UPLOAD_ALLOWED_TYPES = [
  // Dokument
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Bilder
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Video (begränsat)
  "video/mp4",
  "video/webm",
  // Arkiv
  "application/zip",
  "application/x-zip-compressed",
];

export const FILE_UPLOAD_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".webm",
  ".zip",
];

// Farliga filtillägg som ALDRIG ska tillåtas
export const FILE_UPLOAD_BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".mjs",
  ".dll",
  ".so",
  ".dylib",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".cgi",
  ".htaccess",
  ".htpasswd",
  ".pif",
  ".scr",
  ".com",
];

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  prospekt: "Prospekt",
  vilande: "Vilande",
};

export const AGREEMENT_TYPE_LABELS: Record<string, string> = {
  hourly: "Löpande",
  timebank: "Timbank",
  fixed: "Fastpris",
};

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  active: "Aktivt",
  expired: "Utgånget",
  terminated: "Uppsagt",
};

export const AGREEMENT_PERIOD_LABELS: Record<string, string> = {
  monthly: "Månadsvis",
  yearly: "Årsvis",
};

export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  case: "Ärende",
  project: "Projekt",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  active: "Aktivt",
  paused: "Pausat",
  closed: "Avslutat",
};

export const ASSIGNMENT_CATEGORY_LABELS: Record<string, string> = {
  disturbance: "Störning",
  illegal_sublet: "Olovlig andrahand",
  screening: "Granskning",
  renovation_coordination: "Renoveringssamordning",
  investigation: "Utredning",
  other: "Övrigt",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Låg",
  medium: "Medium",
  high: "Hög",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Att göra",
  in_progress: "Pågående",
  done: "Klar",
};

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  call: "Samtal",
  email: "E-post",
  meeting: "Möte",
  site_visit: "Platsbesök",
  note: "Anteckning",
};

export const BILLING_TYPE_LABELS: Record<string, string> = {
  timebank: "Timbank",
  overtime: "Övertid",
  hourly: "Löpande",
  fixed: "Fastpris",
  internal: "Intern",
};

export const BATCH_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  review: "Granskning",
  exported: "Exporterad",
  locked: "Låst",
};

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, string> = {
  knowledge: "Kunskap",
  policy: "Policy",
  routine: "Rutin",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  consultant: "Konsult",
  readonly: "Läsbehörighet",
};

export const MONTH_NAMES = [
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
