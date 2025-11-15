# PDF Report Layout & Fields Documentation

## Overview

This document describes the enhanced Certificate of Analysis (COA) PDF report system with customizable layout, fields, and template settings.

## Features

### 1. Lab Settings Configuration

The system now supports global laboratory configuration through the `LabSettings` model, which allows administrators to customize:

- **Lab Name**: Customizable laboratory name displayed in report headers
- **Lab Logo**: Optional logo URL that appears at the top of COA reports
- **Disclaimer Text**: Customizable disclaimer text shown in the report footer
- **COA Template Settings**: JSON configuration for field visibility, label overrides, and column ordering

### 2. Enhanced Report Layout

#### Header Section
- Lab logo display (if configured)
- Lab name
- Report title: "Certificate of Analysis"
- Version badge (top-right corner)
- Report generation date

#### Client Information Section
- Client name (prominent display)
- Client address (if available)
- Contact name
- Email address
- Phone number

#### Sample Information Section
All sample fields with customizable labels:
- Job Number
- Sample Code
- Sample Description
- UIN Code
- Sample Batch
- Date Received
- Date Due
- Need By Date
- MCD Date
- **Release Date** (new field)
- RM Supplier
- Temperature on Receipt
- Storage Conditions
- Comments (optional)
- Status flags displayed as chips (Urgent, Stability Study, Retest, etc.)

#### Test Results Table
Dynamic table with customizable columns:
- Section
- Test
- Method (with code and name)
- Specification (with range)
- Result
- Unit
- Test Date
- Analyst
- Checked By
- Checked Date
- OOS (Out of Specification)
- Comments

#### Footer Section
- Prepared By signature line with name and date
- Reviewed By signature line (blank for manual signature)
- Customizable disclaimer text
- Page numbering (Page X of Y)

### 3. Template Settings

Template settings are stored as JSON in the `LabSettings.coaTemplateSettings` field and support:

#### Visible Fields
Control which fields appear in the report:

```json
{
  "visibleFields": [
    "jobNumber",
    "sampleCode",
    "sampleDescription",
    "dateReceived",
    "dateDue",
    "releaseDate",
    "client",
    "rmSupplier",
    "temperatureOnReceiptC",
    "storageConditions",
    "comments"
  ]
}
```

If `visibleFields` is empty or not specified, all fields are visible by default.

#### Label Overrides
Customize field labels for your organization:

```json
{
  "labelOverrides": {
    "jobNumber": "Work Order",
    "sampleCode": "Sample ID",
    "releaseDate": "Date Released",
    "rmSupplier": "Raw Material Supplier",
    "temperatureOnReceiptC": "Receipt Temperature",
    "section": "Department",
    "analyst": "Performed By",
    "checkedBy": "Verified By",
    "oos": "Out of Spec"
  }
}
```

#### Column Order
Customize the order of columns in the test results table:

```json
{
  "columnOrder": [
    "section",
    "test",
    "method",
    "result",
    "unit",
    "specification",
    "testDate",
    "analyst",
    "checkedBy",
    "checkedDate",
    "oos",
    "comments"
  ]
}
```

#### Complete Example
```json
{
  "visibleFields": [
    "jobNumber",
    "sampleCode",
    "dateReceived",
    "releaseDate",
    "client",
    "section",
    "test",
    "result",
    "analyst"
  ],
  "labelOverrides": {
    "jobNumber": "Work Order #",
    "sampleCode": "Sample ID",
    "releaseDate": "Released On",
    "analyst": "Tested By"
  },
  "columnOrder": [
    "section",
    "test",
    "result",
    "unit",
    "analyst",
    "testDate"
  ]
}
```

## API Endpoints

### Lab Settings

#### Get Lab Settings
```http
GET /api/lab-settings
Authorization: Bearer <token>
```

**Roles**: All authenticated users can view settings

**Response**:
```json
{
  "id": "uuid",
  "labName": "Laboratory LIMS Pro",
  "labLogoUrl": "https://example.com/logo.png",
  "disclaimerText": "This Certificate of Analysis...",
  "coaTemplateSettings": {
    "visibleFields": [...],
    "labelOverrides": {...},
    "columnOrder": [...]
  },
  "createdAt": "2025-11-15T10:00:00.000Z",
  "updatedAt": "2025-11-15T12:00:00.000Z"
}
```

#### Update Lab Settings
```http
PUT /api/lab-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "labName": "My Laboratory",
  "labLogoUrl": "https://example.com/logo.png",
  "disclaimerText": "Custom disclaimer text",
  "coaTemplateSettings": {
    "visibleFields": ["jobNumber", "sampleCode", "result"],
    "labelOverrides": {
      "jobNumber": "Work Order"
    },
    "columnOrder": ["section", "test", "result"]
  }
}
```

**Roles**: ADMIN, LAB_MANAGER

**Response**: Updated lab settings object

### COA Reports

Existing COA endpoints automatically use the lab settings and template configuration:

- `POST /api/samples/:id/coa/preview` - Preview COA with current settings
- `POST /api/samples/:id/coa/export` - Export COA with current settings
- `GET /api/coa/:id/download` - Download PDF with settings from when it was generated

## Styling & Design

The PDF reports feature a professional design with:

- **Color Scheme**: Blue headers (#1e40af, #2563eb) for a professional look
- **Typography**: Arial font with responsive sizing
- **Layout**: Clean grid-based information sections
- **Status Chips**: Color-coded flags (urgent items in red)
- **Table Design**: Bordered cells with alternating row colors
- **Print-Friendly**: Optimized for A4 paper with proper margins

### CSS Customization

The HTML template includes comprehensive CSS for:
- Page setup with A4 dimensions and margins
- Responsive typography
- Grid-based information layout
- Table styling with word-wrap
- Print-friendly page breaks
- Status chip styling

## Database Schema

### LabSettings Model

```prisma
model LabSettings {
  id                    String   @id @default(uuid()) @db.Uuid
  labName               String   @default("Laboratory LIMS Pro")
  labLogoUrl            String?
  disclaimerText        String?  @db.Text
  coaTemplateSettings   Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdById           String   @db.Uuid
  updatedById           String   @db.Uuid
  
  createdBy             User     @relation("LabSettingsCreatedBy", fields: [createdById], references: [id])
  updatedBy             User     @relation("LabSettingsUpdatedBy", fields: [updatedById], references: [id])
}
```

## Migration

A database migration is included to create the LabSettings table:

```bash
# Run migrations
npm run prisma:migrate:dev --workspace=api
```

Migration file: `20251115114500_add_lab_settings/migration.sql`

## Usage Examples

### Setting Up Lab Configuration

1. **Update Lab Settings via API**:
```bash
curl -X PUT https://your-api.com/api/lab-settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "labName": "Acme Testing Laboratory",
    "labLogoUrl": "https://acme.com/logo.png",
    "disclaimerText": "Results are valid only for the tested sample. This report shall not be reproduced except in full without written approval.",
    "coaTemplateSettings": {
      "visibleFields": [
        "jobNumber", "sampleCode", "dateReceived", "releaseDate",
        "section", "test", "result", "analyst", "oos"
      ],
      "labelOverrides": {
        "jobNumber": "Job #",
        "analyst": "Tested By",
        "checkedBy": "QC Reviewed By"
      },
      "columnOrder": [
        "section", "test", "method", "result", "unit",
        "specification", "analyst", "testDate", "oos"
      ]
    }
  }'
```

2. **Generate COA with Settings**:
```bash
# Export a COA (automatically uses current lab settings)
curl -X POST https://your-api.com/api/samples/SAMPLE_ID/coa/export \
  -H "Authorization: Bearer YOUR_TOKEN"

# Preview a COA before exporting
curl -X POST https://your-api.com/api/samples/SAMPLE_ID/coa/preview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Logo Images**: Use high-resolution logos (PNG format recommended) with transparent backgrounds. Maximum recommended size: 200px width x 60px height.

2. **Disclaimer Text**: Keep disclaimer text concise but legally sufficient. Default provides a standard template.

3. **Field Visibility**: Only include fields that are relevant to your reports. Hiding unnecessary fields improves readability.

4. **Label Customization**: Use consistent terminology that matches your organization's vocabulary.

5. **Column Ordering**: Place most important columns (e.g., Result, OOS) earlier in the table for better visibility.

6. **Version Control**: Each COA export creates an immutable snapshot, so template changes only affect new reports.

## Testing

The implementation includes comprehensive unit tests:

```bash
# Run COA service tests
npm test -- coa-reports.service.spec.ts --workspace=api
```

Tests verify:
- Version incrementing
- PDF generation with settings
- Settings persistence in dataSnapshot
- Template settings application

## Security & Audit

All lab settings changes are:
- Restricted to ADMIN and LAB_MANAGER roles
- Logged in the audit system
- Tracked with creator and updater information
- Timestamped for compliance

## Future Enhancements

Potential future improvements:
- Multiple template profiles (e.g., internal vs. external reports)
- Conditional field display based on test results
- Advanced formatting options (colors, fonts)
- Multi-language support for labels
- Custom header/footer templates
- Interactive report builder UI

## Support

For issues or questions:
1. Check the API documentation
2. Review audit logs for settings changes
3. Verify user roles and permissions
4. Test with preview endpoint before exporting

## Changelog

### Version 1.0 (November 2025)
- Initial implementation of LabSettings model
- Enhanced PDF layout with client address and release date
- Template settings support (visible fields, label overrides, column order)
- Dynamic table generation based on template settings
- Improved CSS styling for professional appearance
- Comprehensive documentation
