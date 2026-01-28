# Architecture Decision Records (ADR)

Dokumentation av viktiga tekniska beslut för Grannfrid-projektet.

---

## ADR-001: Plain Text istället för TipTap

**Status:** Accepterat
**Datum:** 2026-01-17

### Kontext

Journalanteckningar behövde stödja textinmatning. TipTap var initialt implementerat för rich text.

### Beslut

Använd plain text `<textarea>` istället för TipTap.

### Motivering

- TipTap lade till onödig komplexitet
- Rich text-funktioner användes aldrig i praktiken
- Enklare att underhålla och debugga
- Bättre prestanda

### Konsekvenser

- Ingen formatering i journalanteckningar
- Enklare datamodell (TEXT istället för JSON)
- Färre dependencies

---

## ADR-002: withTimeout() för alla Supabase-anrop

**Status:** Accepterat
**Datum:** 2026-01-18

### Kontext

Supabase-queries kunde hänga oändligt vid nätverksproblem, vilket ledde till hängande UI.

### Beslut

Alla Supabase-anrop MÅSTE wrappas med `withTimeout()` från `lib/supabase.ts`.

### Motivering

- Förhindrar oändlig laddning
- Konsekvent timeout-hantering (default 10s)
- Bättre användarupplevelse vid fel

### Konsekvenser

- Alla hooks måste uppdateras
- Lite mer verbose kod
- Mer förutsägbart beteende

---

## ADR-003: Single-tenant med Workspace

**Status:** Accepterat
**Datum:** 2026-01-15

### Kontext

Grannfrid har kontor i Göteborg och Stockholm. Frågan var om data skulle separeras.

### Beslut

Single-tenant modell där workspace används för rapportering, inte åtkomstkontroll.

### Motivering

- Litet team (5-10 konsulter)
- Full transparens önskad
- Enklare RLS-policies
- Alla behöver se all data

### Konsekvenser

- RLS filtrerar på `auth.uid()`, inte workspace_id
- Workspace är endast metadata för rapporter
- Ingen data-isolering mellan kontor

---

## ADR-004: Supabase Singleton Pattern

**Status:** Accepterat
**Datum:** 2026-01-16

### Kontext

"Multiple GoTrueClient instances" warning uppstod vid hot reload i development.

### Beslut

Använd `globalThis.__supabase` för att säkerställa en enda Supabase-instans.

### Motivering

- Undviker auth-konflikter
- Bättre HMR-stöd
- Konsekvent session-hantering

### Konsekvenser

- Något mer komplex initieringskod
- Fungerar korrekt i alla miljöer

---

## ADR-005: React Query v5 Object Signature

**Status:** Accepterat
**Datum:** 2026-01-15

### Kontext

Projektet uppgraderade till React Query v5 som kräver ny syntax.

### Beslut

Använd object signature för alla useQuery/useMutation anrop.

### Motivering

- Krävs av React Query v5
- Bättre TypeScript-stöd
- Tydligare API

### Konsekvenser

- All gammal v4-syntax måste migreras
- Dokumentation uppdaterad
- Linting kan eventuellt läggas till

---

## ADR-006: QueryKeys Factory Pattern

**Status:** Accepterat
**Datum:** 2026-01-15

### Kontext

Cache-invalidering var inkonsekvent med hårdkodade query keys.

### Beslut

Centraliserad `queryKeys.ts` factory för alla cache-nycklar.

### Motivering

- Konsekvent namngivning
- Enkel refaktorering
- TypeScript autocomplete
- Undviker stavfel

### Konsekvenser

- Alla nya queries måste läggas till i factory
- Lätt att hitta alla cache-nycklar
- Bättre kodkvalitet

---

## ADR-007: GDPR-radering tillåten

**Status:** Accepterat
**Datum:** 2026-01-17

### Kontext

Frågan var om journalposter skulle soft-deletes eller permanent radering.

### Beslut

Permanent radering tillåten för journalposter och uppdrag.

### Motivering

- GDPR-krav på rätt att bli glömd
- Användare förstår konsekvensen
- Enklare datamodell

### Konsekvenser

- Radering kaskaderar till relaterade filer och time_entries
- Ingen undo-funktion
- Bekräftelse krävs i UI

---

## ADR-008: Tailwind v4 CSS-first Config

**Status:** Accepterat
**Datum:** 2026-01-15

### Kontext

Tailwind v4 introducerade CSS-first konfiguration.

### Beslut

Använd `@theme {}` i CSS istället för JavaScript config.

### Motivering

- Följer Tailwind v4 best practices
- Snabbare builds
- Enklare att förstå färgsystemet

### Konsekvenser

- Färger måste vara i RGB-format för alpha-stöd
- Ingen tailwind.config.js för themes
- PostCSS-konfiguration krävs

---

## ADR-009: Auth Timeout för UX

**Status:** Accepterat
**Datum:** 2026-01-18

### Kontext

Supabase auth kunde hänga och blockera hela appen.

### Beslut

5s timeout på `getSession()`, 3s timeout på `signOut()`.

### Motivering

- Appen laddas även om Supabase är långsam
- Bättre användarupplevelse
- Förutsägbart beteende

### Konsekvenser

- Användare kan se app utan data initialt
- Loading states hanterar timeout-fall
- Logging för debugging

---

## Mall för nya beslut

```markdown
## ADR-XXX: [Titel]

**Status:** Förslag | Accepterat | Ersatt | Avvisat
**Datum:** YYYY-MM-DD

### Kontext

[Varför behövdes detta beslut?]

### Beslut

[Vad bestämdes?]

### Motivering

[Varför detta beslut framför alternativ?]

### Konsekvenser

[Vad blir effekten av beslutet?]
```
