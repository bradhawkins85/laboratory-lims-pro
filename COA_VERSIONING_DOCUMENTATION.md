# COA Versioning Implementation

## Overview

This document describes the COA (Certificate of Analysis) versioning system implemented in the Laboratory LIMS Pro application. The system ensures that every COA export creates an immutable, versioned record with PDF generation and storage.

## Key Features

### 1. Automatic Versioning
- Every COA export creates a new version
- Version numbers auto-increment (1, 2, 3, ...)
- Each version is immutable - no in-place edits allowed

### 2. PDF Generation
- HTML templates are rendered with sample and test data
- Puppeteer converts HTML to PDF format
- PDFs are stored in MinIO (S3-compatible storage)
- Version number prominently displayed on PDF

### 3. Status Management
- **DRAFT**: COA is being prepared but not finalized
- **FINAL**: COA is finalized and available for download
- **SUPERSEDED**: Previous version replaced by newer FINAL version

### 4. Data Snapshot
Every COA version captures:
- Sample information (code, description, dates, etc.)
- Test assignments with results
- Client details
- Job information
- Analyst and checker details
- Status flags (urgent, retest, etc.)

## API Endpoints

### Export COA (Primary Flow)
```
POST /api/samples/:id/coa/export
```
Creates a new COA version:
1. Builds data snapshot from current sample + tests
2. Renders HTML template with version badge
3. Converts HTML to PDF using Puppeteer
4. Stores PDF in MinIO at `PDF_STORAGE_PATH`
5. Creates COAReport record with incremented version
6. Marks previous FINAL reports as SUPERSEDED
7. Returns version info and download URL

**Response:**
```json
{
  "id": "coa-report-uuid",
  "version": 2,
  "pdfUrl": "/api/coa/coa-report-uuid/download",
  "pdfKey": "coa-reports/SAMPLE-001-v2-1234567890.pdf",
  "status": "FINAL",
  "message": "COA version 2 created and finalized successfully"
}
```

### Preview COA
```
POST /api/samples/:id/coa/preview
```
Generates preview without creating a version or PDF.

**Response:**
```json
{
  "htmlSnapshot": "<html>...</html>",
  "jsonSnapshot": {...},
  "sampleId": "sample-uuid",
  "sampleCode": "SAMPLE-001"
}
```

### List COA Versions
```
GET /api/samples/:id/coa
```
Returns all COA versions for a sample with metadata.

### Download COA PDF
```
GET /api/coa/:id/download
```
Downloads the PDF for a specific COA report version.

### Legacy Endpoints (Backward Compatibility)

#### Build COA (DRAFT)
```
POST /api/coa-reports/build
```
Creates a DRAFT COA without PDF generation.

#### Finalize COA
```
POST /api/coa-reports/:id/finalize
```
Finalizes a DRAFT COA, generates PDF, marks previous as SUPERSEDED.

#### Approve COA
```
POST /api/coa-reports/:id/approve
```
Records approval of a FINAL COA (Lab Manager only).

## Environment Configuration

Add to `packages/api/.env`:

```bash
# PDF Storage
PDF_STORAGE_PATH="coa-reports"  # Path within MinIO bucket

# MinIO Configuration
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
MINIO_BUCKET_NAME="lims-files"

# Puppeteer/Chrome
CHROME_WS_ENDPOINT="ws://localhost:3001"
```

## Database Schema

### COAReport Model
```prisma
model COAReport {
  id              String           @id @default(uuid())
  version         Int              @default(1)
  status          COAReportStatus  @default(DRAFT)
  dataSnapshot    Json             // Immutable data snapshot
  htmlSnapshot    String?          // HTML template rendered
  pdfKey          String?          // S3/MinIO path to PDF
  reportedAt      DateTime?
  notes           String?
  
  sampleId        String
  reportedById    String?
  approvedById    String?
  createdById     String
  updatedById     String
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations...
  
  @@index([sampleId])
  @@index([version])
  @@index([status])
}

enum COAReportStatus {
  DRAFT
  FINAL
  SUPERSEDED
}
```

## Workflow Example

### Scenario: Export COA Version 2

1. **Initial State**: Sample has COA v1 with status FINAL
2. **User Action**: Export new COA
3. **System Actions**:
   - Fetches sample with all test assignments
   - Calculates next version = 2
   - Builds data snapshot (immutable JSON)
   - Renders HTML with version badge
   - Generates PDF from HTML
   - Uploads PDF to MinIO: `coa-reports/SAMPLE-001-v2-1699999999999.pdf`
   - Marks COA v1 status as SUPERSEDED
   - Creates COA v2 with status FINAL
   - Logs audit entry
4. **Result**: COA v2 is available for download, v1 remains accessible but marked superseded

## Security Considerations

- All endpoints require authentication (JWT)
- Role-based access control enforced
- Audit logging tracks all COA operations
- PDFs stored securely in MinIO
- Immutable versioning prevents data tampering
- No in-place edits allowed

## Testing

Comprehensive test suite covers:
- Version increment logic
- PDF generation
- Storage integration
- Status transitions (DRAFT → FINAL → SUPERSEDED)
- Error handling
- Audit logging

Run tests:
```bash
cd packages/api
npm test -- coa-reports.service.spec.ts
```

## Version Display

The version number is prominently displayed:
- **PDF Header**: Blue badge in top-right corner showing "Version N"
- **UI**: Version shown in COA list and detail views
- **API Response**: Version number included in all responses

## Benefits

1. **Audit Trail**: Complete history of all COA versions
2. **Compliance**: Meets regulatory requirements (FDA 21 CFR Part 11, ISO 17025)
3. **Immutability**: Previous versions cannot be modified
4. **Traceability**: Clear version numbering and timestamps
5. **Accessibility**: All versions remain downloadable
6. **Automation**: PDF generation fully automated
