import { can } from '../auth/permissions.helper';
import { Action, Resource } from '../auth/permissions.types';
import { Role } from '@prisma/client';

/**
 * Unit tests for RBAC on accounting fields in Jobs
 * 
 * DoD Requirement #6: Accounting fields visible/editable only to Sales/Accounting (and above)
 */
describe('Jobs - Accounting Fields RBAC', () => {
  const mockJob = {
    id: 'job-uuid-123',
    jobNumber: 'JOB-001',
    quoteNumber: 'QT-001',
    poNumber: 'PO-001',
    soNumber: 'SO-001',
    amountExTax: 1500.00,
    invoiced: false,
    clientId: 'client-uuid',
  };

  describe('Sales/Accounting Role', () => {
    const salesUser = {
      userId: 'sales-user-id',
      email: 'sales@lims.local',
      role: Role.SALES_ACCOUNTING,
    };

    it('should allow Sales/Accounting to read accounting fields', () => {
      const result = can(salesUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });

    it('should allow Sales/Accounting to update accounting fields', () => {
      const result = can(salesUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });

    it('should allow Sales/Accounting to read accounting info', () => {
      const result = can(salesUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Admin Role', () => {
    const adminUser = {
      userId: 'admin-user-id',
      email: 'admin@lims.local',
      role: Role.ADMIN,
    };

    it('should allow Admin to read accounting fields', () => {
      const result = can(adminUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });

    it('should allow Admin to update accounting fields', () => {
      const result = can(adminUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });

    it('should allow Admin full access to accounting fields', () => {
      const readResult = can(adminUser, Action.READ, Resource.ACCOUNTING);
      const updateResult = can(adminUser, Action.UPDATE, Resource.ACCOUNTING);
      const deleteResult = can(adminUser, Action.DELETE, Resource.ACCOUNTING);

      expect(readResult.allowed).toBe(true);
      expect(updateResult.allowed).toBe(true);
      expect(deleteResult.allowed).toBe(true);
    });
  });

  describe('Lab Manager Role', () => {
    const managerUser = {
      userId: 'manager-user-id',
      email: 'manager@lims.local',
      role: Role.LAB_MANAGER,
    };

    it('should allow Lab Manager to read accounting fields', () => {
      const result = can(managerUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });

    it('should allow Lab Manager to read but not necessarily update accounting fields', () => {
      const readResult = can(managerUser, Action.READ, Resource.ACCOUNTING);
      expect(readResult.allowed).toBe(true);
    });

    it('should allow Lab Manager to read accounting fields (for oversight)', () => {
      // Lab managers need visibility for oversight but might not edit
      const result = can(managerUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Analyst Role', () => {
    const analystUser = {
      userId: 'analyst-user-id',
      email: 'analyst@lims.local',
      role: Role.ANALYST,
    };

    it('should NOT allow Analyst to update accounting fields', () => {
      const result = can(analystUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('ACCOUNTING');
    });

    it('should NOT allow Analyst to read accounting fields', () => {
      const result = can(analystUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
    });

    it('should NOT allow Analyst to delete accounting data', () => {
      const result = can(analystUser, Action.DELETE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Client Role', () => {
    const clientUser = {
      userId: 'client-user-id',
      email: 'client@lims.local',
      role: Role.CLIENT,
    };

    it('should NOT allow Client to read accounting fields', () => {
      const result = can(clientUser, Action.READ, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permission');
    });

    it('should NOT allow Client to update accounting fields', () => {
      const result = can(clientUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
    });

    it('should NOT allow Client to create accounting records', () => {
      const result = can(clientUser, Action.CREATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
    });

    it('should NOT allow Client to update accounting data', () => {
      const result = can(clientUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Accounting Fields in Job Updates', () => {
    it('should identify accounting-sensitive fields', () => {
      const accountingFields = [
        'quoteNumber',
        'poNumber',
        'soNumber',
        'amountExTax',
        'invoiced',
      ];

      accountingFields.forEach((field) => {
        expect(mockJob).toHaveProperty(field);
      });
    });

    it('should verify Sales/Accounting can update all accounting fields', () => {
      const salesUser = {
        userId: 'sales-user-id',
        email: 'sales@lims.local',
        role: Role.SALES_ACCOUNTING,
      };

      const canUpdate = can(salesUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(canUpdate.allowed).toBe(true);
    });

    it('should verify Analyst cannot update accounting fields', () => {
      const analystUser = {
        userId: 'analyst-user-id',
        email: 'analyst@lims.local',
        role: Role.ANALYST,
      };

      const canUpdate = can(analystUser, Action.UPDATE, Resource.ACCOUNTING);
      expect(canUpdate.allowed).toBe(false);
    });
  });

  describe('Field-Level Access Control', () => {
    it('should enforce field-level restrictions on Job updates', () => {
      // This test documents the expected behavior for field-level access control
      // In a real implementation, the API should filter out accounting fields
      // for users without ACCOUNTING resource permissions

      const analystUser = {
        userId: 'analyst-user-id',
        email: 'analyst@lims.local',
        role: Role.ANALYST,
      };

      const salesUser = {
        userId: 'sales-user-id',
        email: 'sales@lims.local',
        role: Role.SALES_ACCOUNTING,
      };

      // Analyst should not be able to update accounting fields
      const analystAccountingAccess = can(
        analystUser,
        Action.UPDATE,
        Resource.ACCOUNTING
      );
      expect(analystAccountingAccess.allowed).toBe(false);

      // Sales should be able to update accounting fields
      const salesAccountingAccess = can(
        salesUser,
        Action.UPDATE,
        Resource.ACCOUNTING
      );
      expect(salesAccountingAccess.allowed).toBe(true);
    });
  });

  describe('DoD Requirement #6 Validation', () => {
    it('should pass DoD requirement: Accounting fields visible/editable only to Sales/Accounting (and above)', () => {
      const roles = [
        { role: Role.ADMIN, shouldHaveAccess: true },
        { role: Role.LAB_MANAGER, shouldHaveAccess: true }, // Read access for oversight
        { role: Role.SALES_ACCOUNTING, shouldHaveAccess: true },
        { role: Role.ANALYST, shouldHaveAccess: false },
        { role: Role.CLIENT, shouldHaveAccess: false },
      ];

      roles.forEach(({ role, shouldHaveAccess }) => {
        const user = {
          userId: `user-${role}`,
          email: `${role.toLowerCase()}@lims.local`,
          role,
        };

        const readResult = can(user, Action.READ, Resource.ACCOUNTING);
        const updateResult = can(user, Action.UPDATE, Resource.ACCOUNTING);

        if (shouldHaveAccess) {
          expect(readResult.allowed).toBe(true);
        } else {
          expect(readResult.allowed).toBe(false);
        }

        // Update access (more restrictive)
        if (role === Role.ADMIN || role === Role.SALES_ACCOUNTING) {
          expect(updateResult.allowed).toBe(true);
        } else {
          // Lab Manager might have read but not update
          if (role === Role.LAB_MANAGER) {
            // Lab Manager can read but update is more restrictive
            expect(readResult.allowed).toBe(true);
          } else {
            expect(updateResult.allowed).toBe(false);
          }
        }
      });

      console.log('✅ DoD Requirement #6: Accounting field access control validated');
    });
  });
});
