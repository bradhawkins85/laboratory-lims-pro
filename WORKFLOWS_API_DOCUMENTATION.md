# API Documentation: Key Workflows

This document describes the API endpoints for the key workflows implemented in Laboratory LIMS Pro.

## Table of Contents

1. [Audit Trail](#audit-trail)
2. [Jobs Management](#jobs-management)
3. [Samples Management](#samples-management)
4. [Test Assignments](#test-assignments)
5. [COA Reports](#coa-reports)

---

## Audit Trail

### Query Audit Logs

**Endpoint:** `GET /audit`

**Description:** Query audit logs with filters to track all system changes.

**Roles Required:** ADMIN, LAB_MANAGER

**Query Parameters:**
- `table` (optional): Filter by table name (e.g., "Job", "Sample", "TestAssignment")
- `recordId` (optional): Filter by specific record ID
- `actorId` (optional): Filter by user who made the change
- `action` (optional): Filter by action type (CREATE, UPDATE, DELETE)
- `fromDate` (optional): Start date for time range
- `toDate` (optional): End date for time range
- `txId` (optional): Transaction ID to see related changes
- `page` (optional, default: 1): Page number
- `perPage` (optional, default: 50): Results per page

**Example Request:**
```
GET /audit?table=Sample&recordId=abc123&page=1&perPage=10
```

**Example Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "actorId": "user-123",
      "actorEmail": "analyst@lab.com",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "action": "UPDATE",
      "table": "Sample",
      "recordId": "abc123",
      "changes": {
        "released": {
          "old": false,
          "new": true
        },
        "releaseDate": {
          "old": null,
          "new": "2025-11-14T12:00:00Z"
        }
      },
      "reason": null,
      "at": "2025-11-14T12:00:00Z",
      "txId": "tx-123"
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 10,
  "totalPages": 1
}
```

---

## Jobs Management

### Create Job

**Endpoint:** `POST /jobs`

**Description:** Create a new job with unique jobNumber enforcement.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "jobNumber": "JOB-2024-001",
  "clientId": "client-uuid",
  "needByDate": "2025-12-31T23:59:59Z",
  "mcdDate": "2025-01-15T00:00:00Z",
  "status": "DRAFT",
  "quoteNumber": "Q-2024-001",
  "poNumber": "PO-12345",
  "soNumber": "SO-67890",
  "amountExTax": 1500.00,
  "invoiced": false
}
```

**Response:** Job object with client details and audit info.

**Audit Log:** Creates a CREATE entry with all job fields.

---

### List Jobs

**Endpoint:** `GET /jobs`

**Description:** List all jobs with optional filters and pagination.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

**Query Parameters:**
- `clientId` (optional): Filter by client
- `status` (optional): Filter by status (DRAFT, ACTIVE, COMPLETED, CANCELLED)
- `page` (optional, default: 1)
- `perPage` (optional, default: 50)

**Example Response:**
```json
{
  "jobs": [...],
  "total": 25,
  "page": 1,
  "perPage": 50,
  "totalPages": 1
}
```

---

### Get Job

**Endpoint:** `GET /jobs/:id` or `GET /jobs/by-number/:jobNumber`

**Description:** Get a specific job by ID or job number.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

---

### Update Job

**Endpoint:** `PUT /jobs/:id`

**Description:** Update job details.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Audit Log:** Creates an UPDATE entry with field-level diffs.

---

### Delete Job

**Endpoint:** `DELETE /jobs/:id`

**Description:** Soft delete (marks as CANCELLED).

**Roles Required:** ADMIN, LAB_MANAGER

**Audit Log:** Creates a DELETE entry.

---

## Samples Management

### Create Sample

**Endpoint:** `POST /samples`

**Description:** Create a new sample with unique sampleCode enforcement. Produces a complete audit log entry with all fields.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "jobId": "job-uuid",
  "clientId": "client-uuid",
  "sampleCode": "SAMPLE-2024-001",
  "dateReceived": "2025-11-14T10:00:00Z",
  "dateDue": "2025-11-21T10:00:00Z",
  "rmSupplier": "Acme Supplies",
  "sampleDescription": "Raw material batch #123",
  "uinCode": "UIN-123456",
  "sampleBatch": "BATCH-001",
  "temperatureOnReceiptC": 4.5,
  "storageConditions": "Refrigerated at 4°C",
  "comments": "Sample received in good condition",
  "expiredRawMaterial": false,
  "postIrradiatedRawMaterial": false,
  "stabilityStudy": false,
  "urgent": false,
  "retest": false
}
```

**Response:** Sample object with job, client, and test assignments.

**Audit Log:** Creates a CREATE entry with all sample fields (AC 3.1 compliance).

---

### List Samples

**Endpoint:** `GET /samples`

**Description:** List samples with filters.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

**Query Parameters:**
- `jobId` (optional): Filter by job
- `clientId` (optional): Filter by client
- `released` (optional): Filter by release status
- `urgent` (optional): Filter by urgent flag
- `page` (optional)
- `perPage` (optional)

---

### Release Sample

**Endpoint:** `POST /samples/:id/release`

**Description:** Release a sample (sets released=true, releaseDate=now). Only Lab Manager or Admin can perform this action.

**Roles Required:** ADMIN, LAB_MANAGER

**Audit Log:** Creates an UPDATE entry logging the release action.

---

## Test Assignments

### Create Test Assignment

**Endpoint:** `POST /test-assignments`

**Description:** Add a single test to a sample.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "sampleId": "sample-uuid",
  "testDefinitionId": "test-def-uuid",
  "sectionId": "section-uuid",
  "methodId": "method-uuid",
  "specificationId": "spec-uuid",
  "customTestName": "Custom Test Name",
  "dueDate": "2025-11-21T10:00:00Z",
  "analystId": "analyst-uuid",
  "status": "DRAFT"
}
```

**Audit Log:** Creates a CREATE entry with granular test assignment details.

---

### Add Test Pack

**Endpoint:** `POST /test-assignments/add-test-pack`

**Description:** Add multiple tests from a test pack to a sample (e.g., "Basic 6 Micro Tests").

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "sampleId": "sample-uuid",
  "testPackId": "pack-uuid"
}
```

**Response:** Array of created test assignments.

**Audit Log:** Creates multiple CREATE entries, all grouped with the same txId.

---

### Enter Result

**Endpoint:** `POST /test-assignments/:id/enter-result`

**Description:** Enter test result with automatic OOS computation.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "result": "150",
  "resultUnit": "mg/L",
  "testDate": "2025-11-14T14:00:00Z"
}
```

**OOS Computation:**
- Compares result against specification min/max
- Supports numeric ranges (min/max)
- Supports custom oosRule (>=, <=, equals)
- Non-numeric results compared with target string
- Sets oos=true if out of specification

**Audit Log:** Creates an UPDATE entry with field-level diffs including OOS flag.

---

### List Test Assignments

**Endpoint:** `GET /test-assignments`

**Description:** List test assignments with filters. OOS flags are searchable and filterable.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Query Parameters:**
- `sampleId` (optional): Filter by sample
- `analystId` (optional): Filter by analyst
- `status` (optional): Filter by status
- `oos` (optional): Filter by OOS flag (true/false)
- `page` (optional)
- `perPage` (optional)

**Example:**
```
GET /test-assignments?oos=true&status=COMPLETED
```

---

### Review Test Assignment

**Endpoint:** `POST /test-assignments/:id/review`

**Description:** Review a completed test (sets status=REVIEWED, records checker and check date).

**Roles Required:** ADMIN, LAB_MANAGER

**Requirements:** Test must be in COMPLETED status.

**Audit Log:** Creates an UPDATE entry logging the review action.

---

### Release Test Assignment

**Endpoint:** `POST /test-assignments/:id/release`

**Description:** Release a reviewed test (sets status=RELEASED).

**Roles Required:** ADMIN, LAB_MANAGER

**Requirements:** Test must be in REVIEWED status.

**Audit Log:** Creates an UPDATE entry logging the release action.

---

## COA Reports

### Build COA

**Endpoint:** `POST /coa-reports/build`

**Description:** Build/preview a Certificate of Analysis. Creates a DRAFT version with immutable dataSnapshot and htmlSnapshot.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST

**Request Body:**
```json
{
  "sampleId": "sample-uuid",
  "notes": "Initial draft for review",
  "includeFields": ["optional array of field names"]
}
```

**Response:**
```json
{
  "id": "report-uuid",
  "sampleId": "sample-uuid",
  "version": 1,
  "status": "DRAFT",
  "dataSnapshot": {
    "sample": { /* all sample info */ },
    "tests": [ /* all test results */ ],
    "reportMetadata": { /* version, date, etc */ }
  },
  "htmlSnapshot": "<!DOCTYPE html>...",
  "reportedAt": null,
  "notes": "Initial draft for review",
  "createdAt": "2025-11-14T15:00:00Z"
}
```

**Immutability:** dataSnapshot and htmlSnapshot are captured at build time. Later edits to the sample or tests do not alter this COA version.

**Audit Log:** Creates a CREATE entry.

---

### Finalize COA

**Endpoint:** `POST /coa-reports/:id/finalize`

**Description:** Finalize a COA (sets status=FINAL, marks previous FINAL versions as SUPERSEDED).

**Roles Required:** ADMIN, LAB_MANAGER

**Requirements:** Report must be in DRAFT status.

**Version Control:**
- Each finalize increments the version (1, 2, 3, ...)
- Previous FINAL versions are marked as SUPERSEDED
- Old versions remain downloadable

**Audit Log:** Creates an UPDATE entry.

---

### Approve COA

**Endpoint:** `POST /coa-reports/:id/approve`

**Description:** Approve a finalized COA (records approver).

**Roles Required:** ADMIN, LAB_MANAGER

**Requirements:** Report must be in FINAL status.

**Audit Log:** Creates an UPDATE entry.

---

### List COA Reports for Sample

**Endpoint:** `GET /coa-reports/sample/:sampleId`

**Description:** List all COA versions for a sample with timestamps, authors, and status.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

**Response:**
```json
[
  {
    "id": "report-uuid-3",
    "version": 3,
    "status": "FINAL",
    "reportedAt": "2025-11-14T16:00:00Z",
    "reportedBy": { "name": "Lab Manager", "email": "manager@lab.com" },
    "createdAt": "2025-11-14T15:55:00Z"
  },
  {
    "id": "report-uuid-2",
    "version": 2,
    "status": "SUPERSEDED",
    "reportedAt": "2025-11-14T14:00:00Z",
    "createdAt": "2025-11-14T13:55:00Z"
  },
  {
    "id": "report-uuid-1",
    "version": 1,
    "status": "SUPERSEDED",
    "reportedAt": "2025-11-14T12:00:00Z",
    "createdAt": "2025-11-14T11:55:00Z"
  }
]
```

---

### Preview COA

**Endpoint:** `GET /coa-reports/:id/preview`

**Description:** Preview the HTML snapshot of a COA report in browser.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

**Response:** HTML content (text/html)

---

### Download COA

**Endpoint:** `GET /coa-reports/:id/download`

**Description:** Download the COA report. Returns the exact, immutable snapshot from build time.

**Roles Required:** ADMIN, LAB_MANAGER, ANALYST, SALES_ACCOUNTING

**Response:** HTML file (ready for PDF generation in production)

**File Name:** `COA-{sampleCode}-v{version}.html`

**Note:** In production, this would use Puppeteer or similar to generate PDF from the HTML snapshot.

---

## PDF Report Content

Each COA report includes:

### Sample Information Header
- Job Number
- Sample Code  
- Client Name (with contact info)
- Date Received
- Date Due
- Need By Date
- MCD Date (Manufacturing/Completion Date)
- RM Supplier
- Sample Description
- UIN Code
- Sample Batch
- Temperature on Receipt (°C)
- Storage Conditions
- Comments
- Status Flags (as visual tags: Urgent, Expired, Post-Irradiated, Stability Study, Retest)

### Tests Table
Columns:
- Section
- Method (code + name)
- Specification (code + name + limits + unit)
- Test Name
- Due Date
- Analyst
- Status
- Test Date
- Result (with unit)
- Checked By
- Check Date
- OOS (YES/No)
- Comments

### Footer
- Signatures (Prepared By, Reviewed By)
- Dates
- Disclaimer text
- Page numbers

---

## Database Triggers

**Implementation:** PostgreSQL triggers on all business tables ensure audit logging cannot be bypassed.

**Tables with Triggers:**
- Job
- Sample
- TestAssignment
- COAReport
- Client
- Method
- Specification
- Section
- TestDefinition
- TestPack
- Attachment

**Trigger Function:** `audit_trigger_func()`
- Automatically logs INSERT, UPDATE, DELETE operations
- Captures full old/new values in JSONB
- Uses application context from session variables when available
- Falls back to system user if app context not set

**Context Variables:**
- `app.actor_id`
- `app.actor_email`
- `app.ip`
- `app.user_agent`

---

## Security & Compliance

### RBAC Enforcement

All endpoints enforce role-based access control:

- **ADMIN**: Full access to all operations
- **LAB_MANAGER**: Can create, update, review, release, and approve
- **ANALYST**: Can create and update, but cannot release or approve
- **SALES_ACCOUNTING**: Read-only access to samples and accounting fields
- **CLIENT**: Portal view only (not implemented in these endpoints)

### Audit Trail

Every operation is logged with:
- Who (actorId, actorEmail)
- What (action, table, recordId)
- When (timestamp)
- Changes (field-level old/new values)
- Context (IP, user agent)
- Transaction grouping (txId)

### Immutability

COA reports are immutable once generated:
- dataSnapshot and htmlSnapshot captured at build time
- Later edits don't affect existing reports
- Version control prevents accidental overwrites
- Old versions cannot be deleted, only marked superseded

---

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input or business rule violation
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Uniqueness constraint violation (jobNumber, sampleCode)
- `500 Internal Server Error`: Server error

### Example Error Response

```json
{
  "statusCode": 409,
  "message": "Sample with sampleCode 'SAMPLE-001' already exists",
  "error": "Conflict"
}
```

---

## Testing

The implementation includes comprehensive unit tests:

- ✅ 54 tests total
- ✅ AuditService tests (field-level diffs, transaction grouping)
- ✅ JobsService tests (uniqueness, CRUD, audit logging)
- ✅ TestAssignmentsService tests (OOS computation, test packs, filtering)
- ✅ All tests validate RBAC and audit logging

Run tests:
```bash
cd packages/api
npm test
```

---

## Future Enhancements

1. **PDF Generation**: Integrate Puppeteer for actual PDF output
2. **Report Templates**: Configurable template system per lab
3. **Attachments**: File upload for supporting documents
4. **Notifications**: Email notifications for releases and approvals
5. **E2E Tests**: Full workflow testing
6. **GraphQL API**: Alternative query interface
7. **Real-time Updates**: WebSocket support for live status updates
