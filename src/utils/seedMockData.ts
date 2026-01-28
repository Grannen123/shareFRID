/**
 * Seed mock-data för Grannfrid
 *
 * Anropa från browser console: await window.seedMockData()
 * Eller importera och anropa från en komponent/hook
 *
 * Skapar:
 * - 10 kunder (BRF:er, kommunala bolag, privata fastighetsbolag)
 * - Varje kund får ett avtal (timebank, hourly, fixed)
 * - 3-5 kundkontakter per kund
 * - 5 ärenden per kund (störningar, olovlig andrahandsuthyrning, etc.)
 * - 4-5 ärendekontakter per ärende
 */

import { supabase, withTimeout } from "@/lib/supabase";

// ============================================================================
// MOCKDATA
// ============================================================================

const CUSTOMERS = [
  {
    name: "BRF Solbacken",
    org_number: "769612-4521",
    email: "styrelsen@brfsolbacken.se",
    phone: "08-123 45 67",
    address: "Solbackevägen 12, 123 45 Stockholm",
    antal_lagenheter: 48,
    customer_type: "brf" as const,
  },
  {
    name: "BRF Ekudden",
    org_number: "769623-8834",
    email: "info@brfekudden.se",
    phone: "08-234 56 78",
    address: "Ekuddsvägen 5-15, 112 34 Stockholm",
    antal_lagenheter: 72,
    customer_type: "brf" as const,
  },
  {
    name: "Stockholmshem AB",
    org_number: "556035-9555",
    email: "kundservice@stockholmshem.se",
    phone: "08-508 390 00",
    address: "Flemingsgatan 18, 104 22 Stockholm",
    antal_lagenheter: 52000,
    customer_type: "kommunalt_fastighetsbolag" as const,
  },
  {
    name: "Fastighets AB Balder",
    org_number: "556525-6905",
    email: "forvaltning@balder.se",
    phone: "031-10 95 70",
    address: "Parkgatan 49, 411 38 Göteborg",
    antal_lagenheter: 8500,
    customer_type: "privat_fastighetsbolag" as const,
  },
  {
    name: "BRF Lindgården",
    org_number: "769601-2345",
    email: "styrelse@brflindgarden.se",
    phone: "08-345 67 89",
    address: "Lindgårdsvägen 22-28, 171 52 Solna",
    antal_lagenheter: 36,
    customer_type: "brf" as const,
  },
  {
    name: "Familjebostäder i Göteborg AB",
    org_number: "556037-9530",
    email: "info@familjebostader.se",
    phone: "031-731 50 00",
    address: "Norra Gubberogatan 32, 416 63 Göteborg",
    antal_lagenheter: 18000,
    customer_type: "kommunalt_fastighetsbolag" as const,
  },
  {
    name: "BRF Björkhagen",
    org_number: "769634-5567",
    email: "kontakt@brfbjorkhagen.se",
    phone: "08-456 78 90",
    address: "Björkhagsvägen 8-14, 121 44 Johanneshov",
    antal_lagenheter: 54,
    customer_type: "brf" as const,
  },
  {
    name: "Stiftelsen Stockholms Studentbostäder",
    org_number: "802005-6131",
    email: "info@sssb.se",
    phone: "08-508 06 00",
    address: "Nybohovsgränd 5, 117 63 Stockholm",
    antal_lagenheter: 8200,
    customer_type: "stiftelse" as const,
  },
  {
    name: "BRF Kungsholmen City",
    org_number: "769645-7789",
    email: "styrelsen@brfkungsholmencity.se",
    phone: "08-567 89 01",
    address: "Kungsholmstorg 16, 112 21 Stockholm",
    antal_lagenheter: 120,
    customer_type: "brf" as const,
  },
  {
    name: "Heimstaden Bostad AB",
    org_number: "556864-0873",
    email: "boende@heimstaden.se",
    phone: "020-200 400",
    address: "Östra Promenaden 7A, 211 28 Malmö",
    antal_lagenheter: 42000,
    customer_type: "privat_fastighetsbolag" as const,
  },
];

// Kontaktroller för kunder
const CUSTOMER_CONTACT_ROLES = [
  "Styrelseordförande",
  "Vice ordförande",
  "Kassör",
  "Sekreterare",
  "Ledamot",
  "Suppleant",
  "Fastighetsförvaltare",
  "Teknisk förvaltare",
  "Ekonomisk förvaltare",
  "Områdeschef",
  "Bostadsförvaltare",
];

// Svenska förnamn och efternamn
const FIRST_NAMES = [
  "Anna",
  "Erik",
  "Maria",
  "Lars",
  "Eva",
  "Karl",
  "Karin",
  "Anders",
  "Kristina",
  "Johan",
  "Ingrid",
  "Per",
  "Helena",
  "Mikael",
  "Elisabeth",
  "Stefan",
  "Birgitta",
  "Jan",
  "Margareta",
  "Peter",
  "Lena",
  "Thomas",
  "Ulla",
  "Daniel",
  "Monica",
  "Fredrik",
  "Annika",
  "Magnus",
  "Susanne",
  "Martin",
];

const LAST_NAMES = [
  "Andersson",
  "Johansson",
  "Karlsson",
  "Nilsson",
  "Eriksson",
  "Larsson",
  "Olsson",
  "Persson",
  "Svensson",
  "Gustafsson",
  "Pettersson",
  "Jonsson",
  "Jansson",
  "Hansson",
  "Bengtsson",
  "Lindberg",
  "Lindqvist",
  "Lindgren",
  "Berg",
  "Axelsson",
  "Bergström",
  "Lundberg",
  "Holm",
  "Lindström",
  "Engström",
];

// Ärendetyper med trovärdiga titlar
const ASSIGNMENT_TEMPLATES = {
  disturbance: [
    {
      title: "Störningar lgh {apt}",
      description:
        "Upprepade klagomål på buller och störningar från lägenheten.",
    },
    {
      title: "Ljudstörningar lgh {apt}",
      description: "Grannar klagar på hög musik och fest sent på kvällarna.",
    },
    {
      title: "Hundskötselproblem lgh {apt}",
      description: "Hund skäller konstant och stör omkringboende.",
    },
    {
      title: "Störande beteende lgh {apt}",
      description: "Upprepade störningar i trapphus och gemensamma utrymmen.",
    },
  ],
  illegal_sublet: [
    {
      title: "Misstänkt andrahand lgh {apt}",
      description:
        "Indikationer på att lägenheten hyrs ut i andrahand utan tillstånd.",
    },
    {
      title: "Olovlig uthyrning lgh {apt}",
      description: "Annons upptäckt på Blocket för korttidsuthyrning.",
    },
    {
      title: "Airbnb-uthyrning lgh {apt}",
      description: "Lägenheten finns på Airbnb för korttidsuthyrning.",
    },
  ],
  screening: [
    {
      title: "Hyresgästscreening {name}",
      description: "UC-kontroll och referenstagning för blivande hyresgäst.",
    },
    {
      title: "Bakgrundskontroll {name}",
      description: "Komplett bakgrundskontroll inför hyresavtal.",
    },
  ],
  renovation_coordination: [
    {
      title: "Stambyte koordinering",
      description: "Samordning av boendedialog och information vid stambyte.",
    },
    {
      title: "Fasadrenovering info",
      description:
        "Information och koordinering med boende under fasadrenovering.",
    },
    {
      title: "Balkongrenovering",
      description: "Koordinering av balkongarbeten och boendekontakt.",
    },
  ],
  investigation: [
    {
      title: "Utredning lgh {apt}",
      description: "Allmän utredning av hyresgästsituation.",
    },
    {
      title: "Hyresskuldsärende lgh {apt}",
      description: "Utredning och uppföljning av hyresskulder.",
    },
    {
      title: "Kontraktsbrott lgh {apt}",
      description: "Utredning av möjligt kontraktsbrott.",
    },
  ],
  other: [
    {
      title: "Boendemöte {date}",
      description: "Planering och genomförande av boendemöte.",
    },
    {
      title: "Trivselrond",
      description:
        "Genomgång av fastigheten med fokus på trivsel och säkerhet.",
    },
    {
      title: "Nyckelbyte",
      description: "Koordinering av nyckelbyte i fastigheten.",
    },
  ],
};

// Ärendekontakter (boende, vittnen, etc.)
const ASSIGNMENT_CONTACT_ROLES = [
  "Boende (anmälare)",
  "Boende (anmäld)",
  "Granne",
  "Vittne",
  "Hyresgäst",
  "Tidigare hyresgäst",
  "Andrahandshyresgäst",
  "Kontaktperson",
  "Anhörig",
  "Socialtjänst",
  "Kronofogden",
];

// Avtalstyper med rimliga värden
const AGREEMENT_CONFIGS = [
  {
    type: "timebank" as const,
    hourly_rate: 850,
    included_hours: 10,
    period: "monthly" as const,
  },
  {
    type: "timebank" as const,
    hourly_rate: 900,
    included_hours: 20,
    period: "monthly" as const,
  },
  {
    type: "timebank" as const,
    hourly_rate: 800,
    included_hours: 5,
    period: "monthly" as const,
  },
  {
    type: "hourly" as const,
    hourly_rate: 950,
    included_hours: null,
    period: null,
  },
  {
    type: "hourly" as const,
    hourly_rate: 850,
    included_hours: null,
    period: null,
  },
  {
    type: "fixed" as const,
    hourly_rate: 0,
    fixed_amount: 15000,
    period: "monthly" as const,
  },
  {
    type: "fixed" as const,
    hourly_rate: 0,
    fixed_amount: 8500,
    period: "monthly" as const,
  },
];

// ============================================================================
// HJÄLPFUNKTIONER
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const prefix = randomElement(["070", "073", "076", "079"]);
  const rest = Array.from({ length: 7 }, () => randomInt(0, 9)).join("");
  return `${prefix}-${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = [
    "gmail.com",
    "outlook.com",
    "hotmail.se",
    "telia.se",
    "live.se",
  ];
  const cleanFirst = firstName
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o");
  const cleanLast = lastName
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o");
  return `${cleanFirst}.${cleanLast}@${randomElement(domains)}`;
}

function generateName(): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function generateApartment(): string {
  const floor = randomInt(1, 8);
  const door = randomInt(1, 4);
  return `${floor}${String(door).padStart(2, "0")}${randomInt(1, 2)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================================================
// HUVUDFUNKTION
// ============================================================================

export async function seedMockData(): Promise<{
  customers: number;
  agreements: number;
  customerContacts: number;
  assignments: number;
  assignmentContacts: number;
}> {
  console.log("🌱 Startar seed av mockdata för Grannfrid...\n");

  // Hämta användare
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Du måste vara inloggad för att köra seed.");
  }

  // Hämta profil för workspace
  const { data: profile, error: profileError } = await withTimeout(
    supabase
      .from("profiles")
      .select("id, workspace_id")
      .eq("id", user.id)
      .single(),
  );

  if (profileError || !profile?.workspace_id) {
    throw new Error("Kunde inte hitta workspace. Kontrollera profilen.");
  }

  const workspaceId = profile.workspace_id;
  const consultantId = profile.id;

  console.log(`✅ Workspace: ${workspaceId}`);
  console.log(`✅ Konsult: ${consultantId}\n`);

  // Hämta nästa kundnummer
  const { data: existingCustomers } = await withTimeout(
    supabase
      .from("customers")
      .select("customer_number")
      .order("customer_number", { ascending: false })
      .limit(1),
  );

  let customerCounter = 1;
  if (existingCustomers?.[0]?.customer_number) {
    const match = existingCustomers[0].customer_number.match(/K-(\d+)/);
    if (match) customerCounter = parseInt(match[1], 10) + 1;
  }

  // Skapa kunder
  console.log("📋 Skapar kunder...");
  const createdCustomers: Array<{ id: string; name: string }> = [];

  for (const customerData of CUSTOMERS) {
    const customerNumber = `K-${String(customerCounter++).padStart(3, "0")}`;

    const { data: customer, error } = await withTimeout(
      supabase
        .from("customers")
        .insert({
          workspace_id: workspaceId,
          customer_number: customerNumber,
          name: customerData.name,
          org_number: customerData.org_number,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          antal_lagenheter: customerData.antal_lagenheter,
          customer_type: customerData.customer_type,
          status: "active",
          responsible_consultant_id: consultantId,
        })
        .select()
        .single(),
    );

    if (error) {
      console.error(`❌ ${customerData.name}:`, error.message);
      continue;
    }

    createdCustomers.push({ id: customer.id, name: customer.name });
    console.log(`  ✓ ${customer.customer_number}: ${customer.name}`);
  }

  console.log(`\n✅ Skapade ${createdCustomers.length} kunder\n`);

  // Skapa avtal för varje kund
  console.log("📄 Skapar avtal...");
  const createdAgreements: Array<{
    id: string;
    customerId: string;
    type: string;
  }> = [];

  for (const customer of createdCustomers) {
    const config = randomElement(AGREEMENT_CONFIGS);
    const validFrom = new Date();
    validFrom.setMonth(validFrom.getMonth() - randomInt(1, 12));

    const { data: agreement, error } = await withTimeout(
      supabase
        .from("agreements")
        .insert({
          customer_id: customer.id,
          type: config.type,
          status: "active",
          hourly_rate: config.hourly_rate,
          hourly_rate_evening:
            config.type !== "fixed" ? config.hourly_rate + 200 : null,
          overtime_rate:
            config.type === "timebank" ? config.hourly_rate + 150 : null,
          included_hours: config.included_hours,
          period: config.period,
          fixed_amount:
            config.type === "fixed"
              ? (config as { fixed_amount: number }).fixed_amount
              : null,
          billing_advance: false,
          valid_from: formatDate(validFrom),
          notice_period_months: 3,
          auto_renewal: true,
        })
        .select()
        .single(),
    );

    if (error) {
      console.error(`❌ Avtal för ${customer.name}:`, error.message);
      continue;
    }

    createdAgreements.push({
      id: agreement.id,
      customerId: customer.id,
      type: config.type,
    });
    console.log(`  ✓ ${customer.name}: ${config.type}`);
  }

  console.log(`\n✅ Skapade ${createdAgreements.length} avtal\n`);

  // Skapa kundkontakter
  console.log("👥 Skapar kundkontakter...");
  let totalCustomerContacts = 0;

  for (const customer of createdCustomers) {
    const numContacts = randomInt(3, 5);
    const usedRoles: string[] = [];

    for (let i = 0; i < numContacts; i++) {
      const { firstName, lastName, fullName } = generateName();
      let role = randomElement(CUSTOMER_CONTACT_ROLES);
      while (usedRoles.includes(role)) {
        role = randomElement(CUSTOMER_CONTACT_ROLES);
      }
      usedRoles.push(role);

      const { error } = await withTimeout(
        supabase.from("contacts").insert({
          customer_id: customer.id,
          assignment_id: null,
          name: fullName,
          role: role,
          email: generateEmail(firstName, lastName),
          phone: generatePhone(),
          contact_type: "customer",
          is_invoice_recipient: i === 0,
        }),
      );

      if (!error) totalCustomerContacts++;
    }
  }

  console.log(`✅ Skapade ${totalCustomerContacts} kundkontakter\n`);

  // Hämta nästa ärendenummer
  const { data: existingAssignments } = await withTimeout(
    supabase
      .from("assignments")
      .select("assignment_number")
      .order("assignment_number", { ascending: false })
      .limit(1),
  );

  let assignmentCounter = 1;
  if (existingAssignments?.[0]?.assignment_number) {
    const match = existingAssignments[0].assignment_number.match(/[CP]-(\d+)/);
    if (match) assignmentCounter = parseInt(match[1], 10) + 1;
  }

  // Skapa ärenden
  console.log("📁 Skapar ärenden...");
  const createdAssignments: Array<{
    id: string;
    customerId: string;
    title: string;
  }> = [];

  const categories: Array<keyof typeof ASSIGNMENT_TEMPLATES> = [
    "disturbance",
    "illegal_sublet",
    "screening",
    "renovation_coordination",
    "investigation",
    "other",
  ];

  for (const customer of createdCustomers) {
    const agreement = createdAgreements.find(
      (a) => a.customerId === customer.id,
    );

    for (let i = 0; i < 5; i++) {
      const category = randomElement(categories);
      const templates = ASSIGNMENT_TEMPLATES[category];
      const template = randomElement(templates);

      // Ersätt platshållare i titel
      const title = template.title
        .replace("{apt}", generateApartment())
        .replace("{name}", generateName().fullName)
        .replace("{date}", formatDate(new Date()));

      const assignmentType =
        category === "renovation_coordination" ? "project" : "case";
      const prefix = assignmentType === "case" ? "C" : "P";
      const assignmentNumber = `${prefix}-${String(assignmentCounter++).padStart(3, "0")}`;

      const status = randomElement([
        "active",
        "active",
        "active",
        "closed",
        "paused",
      ]) as "active" | "closed" | "paused";
      const priority = randomElement(["low", "medium", "medium", "high"]) as
        | "low"
        | "medium"
        | "high";

      const { data: assignment, error } = await withTimeout(
        supabase
          .from("assignments")
          .insert({
            customer_id: customer.id,
            agreement_id: agreement?.id || null,
            assignment_number: assignmentNumber,
            title: title,
            description: template.description,
            type: assignmentType,
            category: category,
            status: status,
            priority: priority,
            responsible_consultant_id: consultantId,
          })
          .select()
          .single(),
      );

      if (error) {
        console.error(`❌ Ärende:`, error.message);
        continue;
      }

      createdAssignments.push({
        id: assignment.id,
        customerId: customer.id,
        title: assignment.title,
      });
    }

    console.log(`  ✓ ${customer.name}: 5 ärenden`);
  }

  console.log(`\n✅ Skapade ${createdAssignments.length} ärenden\n`);

  // Skapa ärendekontakter
  console.log("👤 Skapar ärendekontakter...");
  let totalAssignmentContacts = 0;

  for (const assignment of createdAssignments) {
    const numContacts = randomInt(4, 5);

    for (let i = 0; i < numContacts; i++) {
      const { firstName, lastName, fullName } = generateName();
      const role = randomElement(ASSIGNMENT_CONTACT_ROLES);
      const apt = generateApartment();

      const { error } = await withTimeout(
        supabase.from("contacts").insert({
          customer_id: assignment.customerId,
          assignment_id: assignment.id,
          name: fullName,
          role: role,
          email: i < 2 ? generateEmail(firstName, lastName) : null,
          phone: generatePhone(),
          address: `Lgh ${apt}`,
          contact_type: "assignment",
          is_invoice_recipient: false,
          notes: i === 0 ? "Huvudkontakt för ärendet" : null,
        }),
      );

      if (!error) totalAssignmentContacts++;
    }
  }

  console.log(`✅ Skapade ${totalAssignmentContacts} ärendekontakter\n`);

  // Sammanfattning
  const summary = {
    customers: createdCustomers.length,
    agreements: createdAgreements.length,
    customerContacts: totalCustomerContacts,
    assignments: createdAssignments.length,
    assignmentContacts: totalAssignmentContacts,
  };

  console.log("═".repeat(50));
  console.log("📊 SAMMANFATTNING");
  console.log("═".repeat(50));
  console.log(`  Kunder:           ${summary.customers}`);
  console.log(`  Avtal:            ${summary.agreements}`);
  console.log(`  Kundkontakter:    ${summary.customerContacts}`);
  console.log(`  Ärenden:          ${summary.assignments}`);
  console.log(`  Ärendekontakter:  ${summary.assignmentContacts}`);
  console.log("═".repeat(50));
  console.log("\n✨ Klart! Ladda om sidan för att se datan.");

  return summary;
}

// Gör tillgänglig globalt för enkel användning i console
if (typeof window !== "undefined") {
  (window as unknown as { seedMockData: typeof seedMockData }).seedMockData =
    seedMockData;
}
