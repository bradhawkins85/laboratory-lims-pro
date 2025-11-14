# Core Domain & Data Model Implementation

This document describes the comprehensive Prisma schema implementation for the Laboratory LIMS Pro system.

## Overview

The schema implements a complete Laboratory Information Management System (LIMS) with:
- **Master Data Models**: Reference data for lab operations
- **Operational Models**: Day-to-day lab work and samples
- **System Models**: Users, authentication, and audit logging

## Schema Design Principles

1. **UUID Primary Keys**: All entities use UUID (`@db.Uuid`) for primary keys
2. **Audit Fields**: All entities include:
   - `createdAt` / `updatedAt`: Timestamp tracking
   - `createdById` / `updatedById`: User tracking for data governance
3. **Flexible Data**: JSONB fields (`Json`) for metadata and snapshots
4. **Performance**: Strategic indices on frequently queried fields
5. **Data Integrity**: Foreign keys with appropriate cascade/restrict rules

## Entity Categories

### System Models

#### User
Core authentication and authorization entity.

**Key Fields:**
- `email`: Unique identifier for login
- `password`: Hashed password
- `role`: Enum (ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING, CLIENT)

**Relations:**
- Extensive `createdBy`/`updatedBy` relations to all entities
- Functional relations: analyst assignments, report approvals, etc.

#### AuditLog
Immutable audit trail for compliance and traceability.

**Key Fields:**
- `actorId`, `actorEmail`: Who performed the action
- `action`: Enum (CREATE, UPDATE, DELETE)
- `table`, `recordId`: What was changed
- `changes`: JSONB with old/new values
- `txId`: Transaction ID for grouping related changes
- `ip`, `userAgent`: Request context

### Master Data Models

#### Client
Customer/client organizations.

**Key Fields:**
- `name`, `contactName`, `email`, `phone`, `address`

**Relations:**
- Jobs and Samples (business relationships)

#### Method
Testing methods/procedures.

**Key Fields:**
- `code`: Unique identifier
- `name`, `description`
- `unit`: Measurement unit
- `lod`: Limit of Detection
- `loq`: Limit of Quantification

**Relations:**
- TestDefinitions (what tests use this method)
- TestAssignments (actual test executions)

#### Specification
Acceptance criteria for tests.

**Key Fields:**
- `code`: Unique identifier
- `name`
- `target`, `min`, `max`, `unit`: Specification limits
- `oosRule`: Out-of-specification rule/formula

**Relations:**
- TestDefinitions (default specs)
- TestAssignments (specs applied to tests)

#### Section
Lab departments/sections.

**Key Fields:**
- `name`: Unique (e.g., "Microbiology", "Chemistry", "Physical")

**Relations:**
- TestDefinitions (which tests belong to this section)
- TestAssignments (test executions in this section)

#### TestDefinition
Template/definition for a type of test.

**Key Fields:**
- `name`
- `defaultDueDays`: Default turnaround time
- `sectionId`, `methodId`, `specificationId`: References to master data

**Relations:**
- TestPackItems (included in test packs)
- TestAssignments (instances of this test)

#### TestPack & TestPackItem
Bundles of tests sold together (e.g., "Basic 6 Micro Tests").

**Key Fields (TestPack):**
- `name`: Unique bundle name

**Key Fields (TestPackItem):**
- `order`: Display order within the pack
- `testPackId`, `testDefinitionId`: Many-to-many relationship

### Operational Models

#### Job
Work order/project for a client.

**Key Fields:**
- `jobNumber`: Unique identifier
- `needByDate`, `mcdDate`: Important dates
- `status`: Enum (DRAFT, ACTIVE, COMPLETED, CANCELLED)
- `clientId`: Reference to Client
- Financial fields: `quoteNumber`, `poNumber`, `soNumber`, `amountExTax`, `invoiced`

**Relations:**
- Samples (work items in this job)

#### Sample
Physical sample received for testing.

**Key Fields:**
- `sampleCode`: Unique identifier
- `dateReceived`, `dateDue`
- Sample info: `rmSupplier`, `sampleDescription`, `uinCode`, `sampleBatch`
- Physical: `temperatureOnReceiptC`, `storageConditions`
- `comments`: Additional notes
- Status flags: `expiredRawMaterial`, `postIrradiatedRawMaterial`, `stabilityStudy`, `urgent`
- Test assignment status: `allMicroTestsAssigned`, `allChemistryTestsAssigned`
- Release tracking: `released`, `retest`, `releaseDate`

**Relations:**
- Job and Client (business context)
- TestAssignments (tests performed on this sample)
- Attachments (photos, documents)
- COAReports (certificates of analysis)

#### TestAssignment
A specific test performed on a sample.

**Key Fields:**
- `customTestName`: For ad-hoc tests not in TestDefinition
- `dueDate`, `testDate`
- `status`: Enum (DRAFT, IN_PROGRESS, COMPLETED, REVIEWED, RELEASED)
- Result fields: `result`, `resultUnit`, `oos` (out of specification)
- Review: `chkById`, `chkDate`
- Metadata: `comments`, `invoiceNote`, `precision`, `linearity`

**Relations:**
- Sample (what's being tested)
- Section, Method, Specification, TestDefinition (test parameters)
- Analyst (who performs the test)
- Checker (who reviews the results)
- Attachments (test-specific files)

#### Attachment
File storage metadata.

**Key Fields:**
- `fileName`, `fileUrl`, `fileSize`, `mimeType`
- `metadata`: JSONB for additional file info

**Relations:**
- Sample or TestAssignment (what the file is attached to)

#### COAReport
Certificate of Analysis - version-controlled, immutable reports.

**Key Fields:**
- `version`: Version number (1, 2, 3...)
- `status`: Enum (DRAFT, FINAL, SUPERSEDED)
- `dataSnapshot`: JSONB with all data used to generate the report
- `htmlSnapshot`: HTML template used
- `pdfKey`: S3/MinIO path to PDF file
- `reportedAt`, `reportedById`, `approvedById`: Workflow tracking
- `notes`: Additional information

**Relations:**
- Sample (what this report covers)
- Users (who reported and approved)

## Enums

### Role
- `ADMIN`: Full system access
- `LAB_MANAGER`: QA/Reviewer role
- `ANALYST`: Lab technician
- `SALES_ACCOUNTING`: Financial/sales access
- `CLIENT`: Portal access (read-only)

### JobStatus
- `DRAFT`: Being created
- `ACTIVE`: In progress
- `COMPLETED`: Finished
- `CANCELLED`: Cancelled

### TestAssignmentStatus
- `DRAFT`: Not started
- `IN_PROGRESS`: Being performed
- `COMPLETED`: Test done, awaiting review
- `REVIEWED`: QA reviewed
- `RELEASED`: Final, visible to client

### COAReportStatus
- `DRAFT`: Work in progress
- `FINAL`: Approved and finalized
- `SUPERSEDED`: Replaced by newer version

### AuditAction
- `CREATE`: Record created
- `UPDATE`: Record modified
- `DELETE`: Record deleted

## Indices

Strategic indices are placed on:
- All unique identifiers (`jobNumber`, `sampleCode`, `code` fields)
- Foreign keys (for join performance)
- Status fields (for filtering)
- Date fields (for range queries)
- Frequently queried fields (`name`, `email`)
- Audit tracking fields (`actorId`, `at`, `table`, `recordId`)

## Migration

The migration file `20251114000000_initial_core_domain_model/migration.sql` includes:
- All table definitions
- All enum type definitions
- All indices
- All foreign key constraints
- Proper cascade/restrict rules for referential integrity

## Data Seeding

The `seed.ts` file creates:
- 5 test users (one for each role)
- Sample master data:
  - 1 Client
  - 3 Sections (Microbiology, Chemistry, Physical)
  - 2 Methods
  - 2 Specifications
  - 2 Test Definitions
  - 1 Test Pack
- Sample operational data:
  - 1 Job
  - 1 Sample
  - 1 Test Assignment
  - 1 Attachment
  - 1 COA Report
  - 1 Audit Log entry

## Usage Examples

### Creating a New Sample
```typescript
const sample = await prisma.sample.create({
  data: {
    sampleCode: 'SAMPLE-002',
    dateReceived: new Date(),
    sampleDescription: 'Raw material for testing',
    jobId: job.id,
    clientId: client.id,
    createdById: userId,
    updatedById: userId,
  },
});
```

### Assigning a Test
```typescript
const testAssignment = await prisma.testAssignment.create({
  data: {
    sampleId: sample.id,
    testDefinitionId: testDef.id,
    sectionId: section.id,
    methodId: method.id,
    specificationId: spec.id,
    analystId: analyst.id,
    status: 'DRAFT',
    createdById: userId,
    updatedById: userId,
  },
});
```

### Recording a Result
```typescript
await prisma.testAssignment.update({
  where: { id: testAssignment.id },
  data: {
    status: 'COMPLETED',
    testDate: new Date(),
    result: '50.5',
    resultUnit: 'ppm',
    oos: false,
    updatedById: userId,
  },
});
```

### Generating a COA Report
```typescript
const report = await prisma.cOAReport.create({
  data: {
    sampleId: sample.id,
    version: 1,
    status: 'DRAFT',
    dataSnapshot: {
      sample: { /* sample data */ },
      tests: [ /* test results */ ],
    },
    createdById: userId,
    updatedById: userId,
  },
});
```

## Compliance & Audit

Every change to critical data is tracked through:
1. **Timestamp Tracking**: `createdAt`, `updatedAt` on all entities
2. **User Tracking**: `createdById`, `updatedById` on all entities
3. **Immutable Audit Log**: Separate `AuditLog` table with:
   - Who (actorId, actorEmail)
   - What (table, recordId, action, changes)
   - When (at timestamp)
   - Where (ip address)
   - Why (reason field, optional)
   - Transaction grouping (txId)

This provides a complete audit trail for regulatory compliance (GLP, ISO 17025, etc.).

## Future Enhancements

Potential additions not in the current scope:
- Equipment/instrument tracking
- Reagent/consumable inventory
- Training/certification records
- Document management beyond attachments
- Electronic signature workflows
- Integration with external LIMS/ERP systems
