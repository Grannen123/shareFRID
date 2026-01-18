# Custom Skills för Grannfrid

## Översikt

Skills är fördefinierade arbetsflöden som kan köras med slash-kommandon. Dessa skills är optimerade för Grannfrids affärslogik.

---

## Planerade Skills

### /billing

**Syfte:** Beräkna fakturering med timbank-split för en kund/period

**Användning:**
```
/billing Solbacken 2026-01
```

**Vad den gör:**
1. Läser alla journalanteckningar för perioden
2. Grupperar per fakturamottagare
3. Beräknar timbank-split automatiskt
4. Genererar fakturaunderlag

**Context Fork:** Ja - kör i isolerad kontext för att inte belasta huvudkonversationen

---

### /journal

**Syfte:** Lägg till journalanteckning med validering

**Användning:**
```
/journal C-2026-001 "Samtal med boende om störning" 30min
```

**Vad den gör:**
1. Validerar att ärendet finns
2. Kontrollerar timbankssaldo
3. Lägger till anteckning i rätt format
4. Uppdaterar avtalsstatistik

---

### /scaffold-customer

**Syfte:** Skapa mappstruktur för ny kund

**Användning:**
```
/scaffold-customer "BRF Solbacken" 10234 stockholm
```

**Vad den gör:**
1. Skapar mapp under rätt stad
2. Skapar kund.md med frontmatter
3. Skapar avtal.md (tomt)
4. Skapar undermappar (Ärenden, Projekt)

---

### /scaffold-case

**Syfte:** Skapa nytt ärende för kund

**Användning:**
```
/scaffold-case "BRF Solbacken" "Störning Lindqvist"
```

**Vad den gör:**
1. Genererar nästa ärendenummer (C-2026-xxx)
2. Skapar ärende.md med mall
3. Länkar till kundens avtal

---

### /report

**Syfte:** Generera månadsrapport för kund

**Användning:**
```
/report Solbacken 2026-01
```

**Vad den gör:**
1. Sammanställer alla aktiviteter
2. Listar pågående ärenden
3. Visar tidförbrukning vs avtal
4. Formaterar för utskick

---

## Implementeringsnoteringar

### Context Fork

För tunga operationer som `/billing` används `context:fork` för att:
- Isolera beräkningar från huvudkonversationen
- Minska kontextförbrukning
- Möjliggöra parallella körningar

### Validering

Alla skills validerar input med Zod-schemas innan de utför åtgärder:

```typescript
const billingSchema = z.object({
  customer: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});
```

### Felhantering

Skills returnerar strukturerade felmeddelanden:

```json
{
  "success": false,
  "error": "CUSTOMER_NOT_FOUND",
  "message": "Kunden 'Solbacken' hittades inte"
}
```

---

## Framtida Skills

| Skill | Beskrivning | Prioritet |
|-------|-------------|-----------|
| `/fortnox-export` | Exportera faktura till Fortnox | Hög |
| `/outlook-summary` | Sammanfatta mail för ärende | Medium |
| `/calendar-block` | Boka tid i kalendern | Låg |
| `/gdpr-export` | Exportera persondata | Låg |
