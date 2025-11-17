# API E2E Tests

This directory contains end-to-end tests for the Laboratory LIMS Pro API.

## Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run a specific test file
npx jest --config test/jest-e2e.json test/sample-acceptance.e2e-spec.ts
```

## Test Files

### `sample-acceptance.e2e-spec.ts`

Comprehensive acceptance tests for sample management following Gherkin-style BDD format.

#### Test Scenarios

**1. COA Versioning and Immutability**
- ✅ Verifies COA export creates versioned reports (v1, v2, etc.)
- ✅ Validates dataSnapshot and pdfKey are present in reports
- ✅ Tests PDF downloadability
- ✅ Verifies new COA version marks previous as SUPERSEDED
- ✅ Validates PDF immutability (PDFs don't change over time)

**2. Audit Logging with Change Tracking**
- ✅ Tests sample field updates create audit log entries
- ✅ Verifies audit log captures old and new values (e.g., temperatureOnReceiptC: 5 → 8)
- ✅ Validates actorId matches the authenticated user

**3. RBAC Enforcement for Sample Release**
- ✅ Tests Analyst role cannot release samples (403 Forbidden)
- ✅ Validates LAB_MANAGER role can release samples (200 OK)
- ✅ Verifies sample release date is set after successful release

#### Test Data Setup

The test automatically creates:
- Three test users (Admin, Lab Manager, Analyst)
- Test client, job, and sample
- Test method, specification, section, and test definition
- Test assignment with results

All test data is cleaned up after the test suite completes.

#### Prerequisites

Before running these tests, ensure:
1. Database is accessible (PostgreSQL)
2. Services are running (MinIO for file storage, optional Chrome for PDF generation)
3. Environment variables are configured (see `.env.example`)

#### Notes

- Tests run sequentially to maintain data consistency
- Each scenario is independent and isolated
- Tests follow the Given-When-Then structure for readability
- ESLint suppressions are used for test-specific type safety

## Test Structure

```
test/
├── README.md                          # This file
├── jest-e2e.json                      # Jest configuration for e2e tests
├── app.e2e-spec.ts                    # Basic application test
└── sample-acceptance.e2e-spec.ts      # Sample acceptance tests
```

## Writing New Tests

When adding new e2e tests:

1. Follow the existing patterns in `sample-acceptance.e2e-spec.ts`
2. Use descriptive test names following Gherkin format (Given-When-Then)
3. Ensure proper test data setup and cleanup
4. Use the same authentication pattern (create users, get tokens)
5. Add appropriate ESLint suppressions if needed

## Troubleshooting

**Tests fail with "Cannot connect to database"**
- Ensure PostgreSQL is running and accessible
- Check DATABASE_URL in your environment

**Tests fail with "PDF generation failed"**
- Ensure Chrome/Puppeteer is properly installed
- Check CHROME_WS_ENDPOINT if using remote Chrome

**Tests fail with "Storage error"**
- Ensure MinIO is running and accessible
- Check MINIO_* environment variables
