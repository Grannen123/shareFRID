# Release-checklista - Grannfrid App

## Pre-release

### Kodkvalitet

- [x] `npm run test` - Alla 132 tester passerar ✅ 2026-01-23
- [x] `npx tsc --noEmit` - Inga TypeScript-fel ✅ 2026-01-23
- [x] `npm run build` - Produktionsbygge lyckas ✅ 2026-01-23
- [x] `npx playwright test tests/regression-flow.spec.ts` - 3/3 passerar ✅ 2026-01-23
- [x] `npx playwright test tests/notes-flow.spec.ts` - 3/3 passerar ✅ 2026-01-23

### Säkerhet

- [ ] `.env` ligger INTE i git-historik (använd `git filter-repo` om nödvändigt)
- [ ] Supabase-nycklar roterade om de exponerats
- [ ] RLS aktiverat på alla tabeller
- [ ] SECURITY INVOKER på timebank_current_status-view

### Databas

- [ ] Alla migrationer körda i produktions-Supabase
- [ ] `NOTIFY pgrst, 'reload schema'` körd efter migreringar
- [ ] Indexering på vanliga filterfält (customer_id, assignment_id, status)

### Service Worker

- [ ] `public/sw.js` finns
- [ ] Cache-version bumpad om statiska filer ändrats
- [ ] Supabase-anrop exkluderade från cache

---

## Deploy

### Vercel/Netlify

1. Koppla GitHub-repo
2. Build command: `npm run build`
3. Output directory: `dist`
4. Miljövariabler:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Manuell deploy

```bash
npm run build
# Ladda upp dist/ till hosting
```

---

## Post-deploy verifiering

### Funktionalitet

- [ ] Inloggning fungerar
- [ ] Dashboard laddar data
- [ ] Kunder → Skapa/Redigera/Ta bort
- [ ] Uppdrag → Skapa/Redigera/Stänga
- [ ] Journal → Ny post
- [ ] Tidrapport → Registrera tid
- [ ] Fakturering → Skapa batch
- [ ] Anteckningar → Skapa/Koppla
- [ ] Kunskapsbank → Läsa artiklar

### Responsivitet

- [ ] Desktop (1920px)
- [ ] Tablet (768px)
- [ ] Mobil (375px)

### Prestanda

- [ ] Lighthouse score > 80
- [ ] Inga timeout-fel vid normal last
- [ ] Service Worker installerad

---

## Rollback-plan

### Vid kritiskt fel

1. Återställ till tidigare deploy i Vercel/Netlify
2. Eller: `git revert` + ny deploy

### Vid databasfel

1. Kontrollera Supabase Dashboard för fel
2. Kör `NOTIFY pgrst, 'reload schema'` om schema-fel
3. Återställ från backup vid dataförlust

---

## Kontaktinformation

- **Supabase Dashboard:** [dashboard.supabase.com](https://dashboard.supabase.com)
- **Vercel Dashboard:** [vercel.com](https://vercel.com)

---

## Version

- **App:** 0.0.0 (se package.json)
- **Node:** 18+ rekommenderat
- **Checklista uppdaterad:** 2026-01-23
