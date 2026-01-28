# Testing Implementation Checklist

**Version:** 1.0
**Created:** 2026-01-18
**Purpose:** Step-by-step checklist for implementing testing in Grannfrid app

---

## PHASE 1: FOUNDATION (Week 1)

### Step 1: Install Dependencies

- [ ] Run installation command:

```bash
npm install -D \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/dom \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

- [ ] Verify installation: `npx vitest --version`
- [ ] Commit: `git add package.json package-lock.json && git commit -m "deps: add Vitest and testing libraries"`

### Step 2: Create Vitest Configuration

- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/vitest.config.ts`
  - Copy from TESTING_QUICK_START.md section 2.1
  - Update paths as needed
- [ ] Verify syntax: `npx vitest --version` should work
- [ ] Commit: `git add vitest.config.ts && git commit -m "config: add Vitest configuration"`

### Step 3: Create Test Setup File

- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/tests/setup.ts`
  - Copy from TESTING_QUICK_START.md section 2.2
  - This sets up globals, cleanup, mocks
- [ ] Verify file exists: `ls -la tests/setup.ts`
- [ ] Commit: `git add tests/setup.ts && git commit -m "test: add test setup file"`

### Step 4: Create Supabase Mock Strategy

- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/tests/mocks/supabase.ts`
  - Copy from TESTING_QUICK_START.md section 2.3
  - Factory for creating mock Supabase client
- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/tests/mocks/handlers.ts`
  - Copy from TESTING_QUICK_START.md section 2.4
  - Global mock setup
- [ ] Verify files exist: `ls -la tests/mocks/`
- [ ] Commit: `git add tests/mocks/ && git commit -m "test: add Supabase mock strategy"`

### Step 5: Update package.json Scripts

- [ ] Edit `package.json` scripts section
  - Add: `"test": "vitest"`
  - Add: `"test:ui": "vitest --ui"`
  - Add: `"test:coverage": "vitest --coverage"`
  - Add: `"test:watch": "vitest --watch"`
  - Add: `"test:all": "npm run test && npm run test:e2e"`
- [ ] Verify scripts: `npm run test -- --help`
- [ ] Commit: `git add package.json && git commit -m "config: add test scripts"`

### Step 6: Write billing-logic.test.ts

- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/src/lib/billing-logic.test.ts`
  - Copy complete test file from TESTING_QUICK_START.md section 3.1
  - 45+ lines of comprehensive tests
  - Tests split logic, overtime calculation, indexation warning
- [ ] Run test: `npm test -- billing-logic.test.ts`
  - Expected: ✓ 12 passed
- [ ] Verify coverage: All branches covered
- [ ] Commit: `git add src/lib/billing-logic.test.ts && git commit -m "test: add billing-logic unit tests (12 tests, 100% coverage)"`

### Step 7: Write schemas.test.ts

- [ ] Create `/Users/jonashalvarsson/Desktop/alla mina appar/src/lib/schemas.test.ts`
  - Copy complete test file from TESTING_QUICK_START.md section 4.1
  - 20+ tests for Zod schemas
  - Tests validation, refine rules, error handling
- [ ] Run test: `npm test -- schemas.test.ts`
  - Expected: ✓ 20+ passed
- [ ] Commit: `git add src/lib/schemas.test.ts && git commit -m "test: add Zod schema validation tests (20+ tests)"`

### Step 8: Run All Phase 1 Tests

- [ ] Run all tests: `npm test`
  - Expected: ✓ 32+ tests passing
  - Expected coverage: 70%+ for lib/ files
- [ ] Run UI dashboard: `npm run test:ui`
  - Verify all tests visible and passing
- [ ] Generate coverage: `npm run test:coverage`
  - Check coverage report in `coverage/index.html`
- [ ] Commit: `git add . && git commit -m "test: Phase 1 foundation complete - 32+ unit tests passing"`

### Step 9: Update Documentation

- [ ] Update `docs/SESSION_LOG.md`:
  - Add entry for testing setup session
  - Document what was accomplished
  - Note any blockers
- [ ] Update `docs/CHANGELOG.md`:
  - Add entry: `[2026-01-18] Test: Added Vitest + 32 unit tests`
- [ ] Update `docs/TODO.md`:
  - Mark "Phase 1: Testing Foundation" as COMPLETE
  - Add Phase 2 tasks
- [ ] Commit: `git add docs/ && git commit -m "docs: update after Phase 1 testing implementation"`

### Phase 1 Summary

**Expected time:** 6-8 hours
**Expected outcome:**

- ✅ Vitest installed and configured
- ✅ Test infrastructure in place
- ✅ 32+ unit tests passing
- ✅ billing-logic fully tested (100%)
- ✅ Zod validation fully tested (95%)
- ✅ Mock strategy documented
- ✅ Ready for Phase 2

---

## PHASE 2: COMPONENTS (Week 2)

### Component Tests to Create

- [ ] `src/features/customers/TimebankWidget.test.tsx`
  - Tests display logic
  - Tests overtime visualization
  - Tests percentage calculations

- [ ] `src/features/customers/CustomerForm.test.tsx`
  - Tests form submission
  - Tests validation
  - Tests error handling
  - Tests optional fields

- [ ] `src/features/customers/AgreementForm.test.tsx`
  - Tests conditional fields based on agreement type
  - Tests hourly vs timebank vs fixed logic
  - Tests refine() validation

- [ ] `src/features/assignments/JournalEntryForm.test.tsx`
  - Tests hours validation
  - Tests split preview (if implemented)
  - Tests entry_type selection
  - Tests required content field

- [ ] `src/features/tasks/TaskForm.test.tsx`
  - Tests customer/assignment linking
  - Tests priority selection
  - Tests due_date handling

### Instructions for Phase 2

1. Reference TESTING_STRATEGY.md section 6.2 for TimebankWidget example
2. Use `@testing-library/react` and `userEvent` for interactions
3. Wrap components with QueryClientProvider for tests
4. Mock React Query for hook calls
5. Test user-facing behavior, not implementation
6. Aim for 20-30 component tests total

---

## PHASE 3: INTEGRATION (Week 3)

### Hook Integration Tests to Create

- [ ] `src/hooks/useBilling.integration.test.ts`
  - Test useBillingBatches hook
  - Test error handling
  - Test with React Query wrapper

- [ ] `src/hooks/useCustomers.integration.test.ts`
  - Test fetch, create, update, delete
  - Test with mocked Supabase

- [ ] `src/hooks/useJournal.integration.test.ts`
  - Test entry creation with split logic
  - Test time entry creation

- [ ] Additional hooks as needed (useAgreements, useTasks, etc.)

### Instructions for Phase 3

1. Use `renderHook` from @testing-library/react
2. Wrap with QueryClientProvider
3. Mock Supabase responses
4. Test success and error paths
5. Use waitFor() for async operations
6. Verify cache invalidation on mutations

---

## PHASE 4: E2E TESTS (Week 4)

### E2E Test Scenarios to Create

- [ ] `tests/e2e/customer-workflow.spec.ts`
  - Create customer → add agreement → create assignment → journal → time entry

- [ ] `tests/e2e/billing-flow.spec.ts`
  - Create billing batch → verify split entries → export CSV

- [ ] `tests/e2e/task-workflow.spec.ts`
  - Create task → assign to user → change status

- [ ] `tests/e2e/form-validation.spec.ts`
  - Test validation errors on all forms
  - Test required field messages

### Instructions for Phase 4

1. Use Playwright (already configured)
2. Reference TESTING_STRATEGY.md section 8.2 for customer-workflow example
3. Test real user interactions (no mocks)
4. Test critical happy paths and error cases
5. Verify data persistence
6. Check split logic works end-to-end

---

## CONTINUOUS INTEGRATION (Week 4+)

### GitHub Actions Setup

- [ ] Create `.github/workflows/test.yml`
  - Install dependencies
  - Run unit tests
  - Generate coverage
  - Upload to codecov
  - Run E2E tests

- [ ] Create `.github/workflows/test.env`
  - E2E_EMAIL=test@grannfrid.se
  - E2E_PASSWORD=Test1234!

### Pre-commit Hook (Optional)

- [ ] Create `.husky/pre-commit`
  - Run: `npm test -- --run`
  - Prevents pushing failing tests

---

## COVERAGE TARGETS

### Phase 1 (Week 1)

```
billing-logic.ts:      100% (12 tests)
schemas.ts:            95%  (20+ tests)
lib/:                  ~70% coverage
Overall:               ~10% coverage
```

### Phase 2 (Week 2)

```
Components:            60% (20-30 tests)
Overall:               ~25% coverage
```

### Phase 3 (Week 3)

```
Hooks:                 70% (15-20 tests)
Overall:               ~50% coverage
```

### Phase 4 (Week 4)

```
E2E critical flows:    6-8 scenarios
Overall:               70%+ coverage
```

---

## USEFUL COMMANDS

```bash
# Run specific test file
npm test -- billing-logic.test.ts

# Run tests matching pattern
npm test -- --grep "calculateBillingWithSplit"

# Run in watch mode (useful during development)
npm run test:watch

# Run with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E in UI mode
npm run test:e2e:ui

# Run all tests
npm run test:all

# Debug a test
npm test -- billing-logic.test.ts --inspect-brk
```

---

## TROUBLESHOOTING

### Issue: "Cannot find module '@/lib/supabase'"

**Solution:**

- Check `vitest.config.ts` has correct alias
- Verify path is absolute: `path.resolve(__dirname, './src')`

### Issue: "ReferenceError: document is not defined"

**Solution:**

- Check `vitest.config.ts` has `environment: 'jsdom'`
- Check `tests/setup.ts` imports properly

### Issue: "Mock not working"

**Solution:**

- Mocks must be defined BEFORE imports
- Check `vi.mock()` is at top of test file
- Verify mock path matches import path

### Issue: Tests timeout

**Solution:**

- Increase timeout in test: `it('test', () => {...}, { timeout: 10000 })`
- Check for unresolved promises
- Verify async/await usage

### Issue: "Supabase client is already initialized"

**Solution:**

- This means multiple instances exist
- Check global singleton setup in `lib/supabase.ts`
- Verify `globalThis.__supabase` caching

---

## GIT WORKFLOW

### Commit messages for Phase 1

```
git commit -m "deps: add Vitest and testing libraries"
git commit -m "config: add Vitest configuration"
git commit -m "test: add test setup file"
git commit -m "test: add Supabase mock strategy"
git commit -m "config: add test scripts to package.json"
git commit -m "test: add billing-logic unit tests (12 tests, 100% coverage)"
git commit -m "test: add Zod schema validation tests (20+ tests)"
git commit -m "test: Phase 1 foundation complete - 32+ tests passing"
git commit -m "docs: update after Phase 1 testing implementation"
```

### Create feature branch (optional)

```bash
git checkout -b feature/testing-phase1
# ... do work ...
git push origin feature/testing-phase1
# Create PR for review
```

---

## FILE CHECKLIST

### After Phase 1, you should have:

```
vitest.config.ts                           ← NEW
tests/
├── setup.ts                               ← NEW
├── mocks/
│   ├── supabase.ts                        ← NEW
│   └── handlers.ts                        ← NEW
├── smoke.spec.ts                          ← EXISTING (keep)
└── fixtures/
    └── sample-upload.txt                  ← EXISTING (keep)

src/lib/
├── billing-logic.test.ts                  ← NEW
└── schemas.test.ts                        ← NEW

docs/
├── TESTING_STRATEGY.md                    ← NEW
├── TESTING_QUICK_START.md                 ← NEW
├── TESTING_SUMMARY.md                     ← NEW
└── TESTING_IMPLEMENTATION_CHECKLIST.md    ← NEW (this file)
```

### Total new files: 9

### Total new test cases: 32+

### Total new lines of test code: ~800 lines

---

## SUCCESS CRITERIA FOR EACH PHASE

### Phase 1 ✅

- [ ] All 12 billing-logic tests passing
- [ ] All 20+ schema tests passing
- [ ] Coverage report generated
- [ ] Mock strategy working
- [ ] All commits pushed to main

### Phase 2 ✅

- [ ] All 20-30 component tests passing
- [ ] Forms tested with user interactions
- [ ] Validation errors verified
- [ ] Coverage increased to 25%+

### Phase 3 ✅

- [ ] All 15-20 hook tests passing
- [ ] Integration with Supabase mocks verified
- [ ] React Query caching tested
- [ ] Coverage increased to 50%+

### Phase 4 ✅

- [ ] All 6-8 E2E scenarios passing
- [ ] Critical user journeys verified
- [ ] Split logic verified end-to-end
- [ ] Coverage at 70%+

---

## TIME TRACKING

| Phase | Task                 | Est. Time | Actual | Notes |
| ----- | -------------------- | --------- | ------ | ----- |
| 1     | Dependencies         | 0.5h      |        |       |
| 1     | Config               | 1h        |        |       |
| 1     | Setup                | 1h        |        |       |
| 1     | Mocks                | 1.5h      |        |       |
| 1     | billing-logic tests  | 2h        |        |       |
| 1     | schemas tests        | 1.5h      |        |       |
| 1     | **Subtotal Phase 1** | **7.5h**  |        |       |
| 2     | Component tests      | 6h        |        |       |
| 3     | Integration tests    | 8h        |        |       |
| 4     | E2E tests            | 4h        |        |       |
|       | **Total**            | **25.5h** |        |       |

---

## REVIEW CHECKLIST (Before moving to next phase)

- [ ] All tests passing locally
- [ ] Coverage report reviewed
- [ ] Code follows project patterns
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] Commits are clean and descriptive
- [ ] No console.error in output
- [ ] Mock strategy working correctly
- [ ] Ready for team review

---

## FINAL NOTES

1. **Don't rush:** Testing is an investment, not a cost
2. **Test the hard stuff first:** billing-logic is the foundation
3. **Keep mocks simple:** Complex mocks defeat the purpose
4. **Test behavior, not implementation:** Focus on what users see
5. **Document as you go:** Future you will thank you
6. **Celebrate milestones:** Each phase is a win!

---

**You're ready to implement! Start with Phase 1 and take it step by step. 🚀**

Questions? Refer to:

- `docs/TESTING_STRATEGY.md` – Complete reference
- `docs/TESTING_QUICK_START.md` – Hands-on guide
- `docs/TESTING_SUMMARY.md` – Overview & decisions
