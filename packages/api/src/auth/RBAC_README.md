# RBAC Permission System

This document describes the Role-Based Access Control (RBAC) system implemented in Laboratory LIMS Pro.

## System Roles

The system defines 5 distinct roles with specific capabilities:

### 1. ADMIN
- **Full system access**
- Can manage users, roles, and system settings
- Can perform all operations on all resources
- Can access audit logs

### 2. LAB_MANAGER (QA/Reviewer)
- Approve and release test results and COAs (Certificates of Analysis)
- View all samples and tests
- Edit samples and tests
- Manage templates and test packs
- Access audit logs
- **Cannot:** Delete resources, modify user roles

### 3. ANALYST
- Create and edit samples (only assigned samples)
- Enter test results for assigned tests
- Upload attachments
- Request re-tests
- Generate draft reports
- **Cannot:** Approve or release results, access audit logs, manage templates

### 4. SALES_ACCOUNTING
- Read all samples and tests
- Access and modify accounting fields (quotes, PO, SO, invoices)
- Create and update quotes, purchase orders, and sales orders
- Set invoice flags
- **Cannot:** Modify sample or test data, access audit logs

### 5. CLIENT
- Portal access to view their own samples only
- View test results for their samples
- View final released COA reports only (no drafts)
- **Read-only access** - cannot modify any data
- **Cannot:** Access other clients' data, view draft reports, access audit logs

## Permission Matrix

### Samples
| Action | ADMIN | LAB_MANAGER | ANALYST | SALES_ACCOUNTING | CLIENT |
|--------|-------|-------------|---------|------------------|--------|
| CREATE | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ |
| READ   | ✅ | ✅ | ✅ (assigned) | ✅ | ✅ (own only) |
| UPDATE | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ |
| DELETE | ✅ | ❌ | ❌ | ❌ | ❌ |

### Tests
| Action | ADMIN | LAB_MANAGER | ANALYST | SALES_ACCOUNTING | CLIENT |
|--------|-------|-------------|---------|------------------|--------|
| ASSIGN/UNASSIGN | ✅ | ✅ | ❌ | ❌ | ❌ |
| EDIT_RESULTS | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ |
| APPROVE | ✅ | ✅ | ❌ | ❌ | ❌ |
| RELEASE | ✅ | ✅ | ❌ | ❌ | ❌ |
| READ | ✅ | ✅ | ✅ (assigned) | ✅ | ✅ (own only) |

### Reports (COA)
| Action | ADMIN | LAB_MANAGER | ANALYST | SALES_ACCOUNTING | CLIENT |
|--------|-------|-------------|---------|------------------|--------|
| GENERATE_DRAFT | ✅ | ❌ | ✅ | ❌ | ❌ |
| FINALIZE | ✅ | ✅ | ❌ | ❌ | ❌ |
| RELEASE | ✅ | ✅ | ❌ | ❌ | ❌ |
| VIEW_VERSIONS | ✅ | ✅ | ✅ | ❌ | ❌ |
| READ | ✅ | ✅ | ✅ | ✅ | ✅ (released only) |

### Audit Logs
| Action | ADMIN | LAB_MANAGER | ANALYST | SALES_ACCOUNTING | CLIENT |
|--------|-------|-------------|---------|------------------|--------|
| READ | ✅ | ✅ | ❌ | ❌ | ❌ |
| WRITE | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note:** Audit logs are read-only for all users. They are never editable.

### Settings/Templates/Test Packs
| Action | ADMIN | LAB_MANAGER | ANALYST | SALES_ACCOUNTING | CLIENT |
|--------|-------|-------------|---------|------------------|--------|
| MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ |
| READ | ✅ | ✅ | ✅ | ❌ | ❌ |

## Using the Permission System

### Permission Helper Function

The core permission checking function is `can(user, action, resource, context?)`:

```typescript
import { can, Action, Resource } from './auth';

// Basic role-level check
const result = can(user, Action.CREATE, Resource.SAMPLE);
if (result.allowed) {
  // User can create samples
} else {
  console.log(result.reason); // Why permission was denied
}

// Context-based check (record-level permissions)
const result = can(
  user,
  Action.UPDATE,
  Resource.SAMPLE,
  { assignedUserId: sample.assignedUserId, clientId: sample.clientId }
);
```

### Using Decorators in Controllers

#### Route-level permissions (role check only)

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { RequirePermission, Action, Resource } from '../auth';

@Controller('samples')
export class SamplesController {
  @Post()
  @RequirePermission(Action.CREATE, Resource.SAMPLE)
  async createSample(@Body() dto: CreateSampleDto) {
    // Only users with CREATE permission on SAMPLE can access this
  }
}
```

#### Record-level permissions (with context check)

```typescript
@Controller('samples')
export class SamplesController {
  @Patch(':id')
  @RequirePermission(Action.UPDATE, Resource.SAMPLE, true) // true = check context
  async updateSample(@Param('id') id: string, @Body() dto: UpdateSampleDto) {
    // Guard will fetch the sample and verify user has access to it
    // For ANALYST: checks if assignedUserId matches user.id
    // For CLIENT: checks if clientId matches user.id
  }
}
```

### Using Roles Decorator (Legacy)

For simple role checks, you can still use the `@Roles()` decorator:

```typescript
import { Roles } from '../auth';
import { Role } from '@prisma/client';

@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async getAllUsers() {
    // Only ADMIN and LAB_MANAGER can access
  }
}
```

### Helper Functions

```typescript
import {
  hasRole,
  hasAnyRole,
  isAdmin,
  canApprove,
  canManageTemplates,
  canViewAuditLogs,
  getAllowedActions,
} from './auth';

// Check specific role
if (hasRole(user, Role.ADMIN)) { }

// Check multiple roles
if (hasAnyRole(user, [Role.ADMIN, Role.LAB_MANAGER])) { }

// Check if user can approve
if (canApprove(user)) { }

// Get all allowed actions for a resource
const actions = getAllowedActions(user, Resource.SAMPLE);
// Returns: [Action.CREATE, Action.READ, Action.UPDATE, ...]
```

## Database Schema

### Role Enum
```prisma
enum Role {
  ADMIN             // Full access
  LAB_MANAGER       // QA/Reviewer
  ANALYST           // Lab technician
  SALES_ACCOUNTING  // Business operations
  CLIENT            // Portal users
}
```

### Sample Model (Excerpt)
```prisma
model Sample {
  userId         String   @db.Uuid  // Creator
  assignedUserId String?  @db.Uuid  // Assigned analyst
  clientId       String?  @db.Uuid  // Client owner (for portal access)
}
```

### Report Model (Excerpt)
```prisma
model Report {
  status      ReportStatus  // DRAFT, FINALIZED, RELEASED
  version     Int
  finalizedAt DateTime?
  releasedAt  DateTime?
}

enum ReportStatus {
  DRAFT       // Created by Analyst
  FINALIZED   // Finalized by Lab Manager
  RELEASED    // Released - visible to clients
}
```

### Audit Log Model
```prisma
model AuditLog {
  id         String   @id
  action     String   // CREATE, UPDATE, DELETE, etc.
  resource   String   // SAMPLE, TEST, REPORT, etc.
  resourceId String?
  userId     String
  userName   String   // Snapshot at time of action
  userRole   String   // Snapshot at time of action
  changes    Json?    // What changed
  createdAt  DateTime
}
```

## Permission Context

Context provides record-level permission checks:

```typescript
interface PermissionContext {
  userId?: string;          // Resource creator
  assignedUserId?: string;  // Assigned analyst
  clientId?: string;        // Client owner
  status?: string;          // Resource status
  ownerId?: string;         // Generic owner field
}
```

### Context-based Rules

1. **ANALYST** can only access samples/tests where `assignedUserId === user.id`
2. **CLIENT** can only access resources where `clientId === user.id`
3. **CLIENT** can only view reports with status `RELEASED`
4. **SALES_ACCOUNTING** cannot modify accounting fields on `FINALIZED` or `RELEASED` items

## Guards

The system uses three guards (applied globally):

1. **JwtAuthGuard** - Validates JWT token and attaches user to request
2. **RolesGuard** - Checks `@Roles()` decorator for simple role checks
3. **PermissionsGuard** - Checks `@RequirePermission()` decorator for fine-grained permissions

## Testing

Run permission tests:

```bash
npm test -- permissions.helper.spec.ts
```

Tests cover:
- Basic role permissions for all roles
- Context-based permissions (record-level)
- Edge cases (clients accessing drafts, analysts accessing unassigned samples)
- Helper functions
- Audit log restrictions

## Security Considerations

1. **Audit logs are immutable** - No one can modify or delete audit logs
2. **Record-level checks** - Always use context when checking access to specific records
3. **Status-based restrictions** - Finalized/released reports cannot be modified except by authorized roles
4. **Client isolation** - Clients can only access their own data
5. **Analyst assignment** - Analysts only access assigned work

## UI Integration

For frontend integration, you can:

1. Fetch user role and permissions on login
2. Use `getAllowedActions()` to determine which UI elements to show
3. Hide/disable buttons for disallowed actions
4. Still enforce on API - never trust client-side checks alone

Example:
```typescript
// Frontend (Next.js/React)
const allowedActions = getAllowedActions(user, 'SAMPLE');
const canCreateSample = allowedActions.includes('CREATE');

return (
  <>
    {canCreateSample && <Button>Create Sample</Button>}
  </>
);
```

## Migration Guide

If updating from old roles (MANAGER, TECHNICIAN, USER):

1. Run Prisma migration to update schema
2. Update seed data with new roles
3. Map old roles to new:
   - MANAGER → LAB_MANAGER
   - TECHNICIAN → ANALYST
   - USER → CLIENT (or appropriate role)

## Summary

The RBAC system provides:
- ✅ 5 clearly defined roles
- ✅ Comprehensive permission matrix
- ✅ Role-level and record-level checks
- ✅ Easy-to-use decorators and helpers
- ✅ Immutable audit logs
- ✅ Client data isolation
- ✅ Workflow status enforcement
- ✅ Full test coverage
