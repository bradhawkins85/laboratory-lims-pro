/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

/**
 * Sample Acceptance Tests (Gherkin-style BDD)
 *
 * These tests validate the acceptance criteria for sample management:
 * 1. COA versioning and immutability
 * 2. Audit logging with change tracking
 * 3. RBAC enforcement for sample operations
 */
describe('Sample Acceptance Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test users
  let adminToken: string;
  let managerToken: string;
  let analystToken: string;

  // Test data IDs
  let adminUserId: string;
  let managerUserId: string;
  let analystUserId: string;
  let clientId: string;
  let jobId: string;
  let sampleId: string;
  let testDefinitionId: string;
  let testAssignmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup test data: users, clients, jobs, samples, and test definitions
   */
  async function setupTestData() {
    // Create test users with different roles
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-acceptance@test.com',
        password: hashedPassword,
        name: 'Admin User',
        role: Role.ADMIN,
      },
    });
    adminUserId = adminUser.id;

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager-acceptance@test.com',
        password: hashedPassword,
        name: 'Manager User',
        role: Role.LAB_MANAGER,
      },
    });
    managerUserId = managerUser.id;

    const analystUser = await prisma.user.create({
      data: {
        email: 'analyst-acceptance@test.com',
        password: hashedPassword,
        name: 'Analyst User',
        role: Role.ANALYST,
      },
    });
    analystUserId = analystUser.id;

    // Get auth tokens
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin-acceptance@test.com',
        password: 'password123',
      });
    adminToken = adminLoginRes.body.access_token;

    const managerLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manager-acceptance@test.com',
        password: 'password123',
      });
    managerToken = managerLoginRes.body.access_token;

    const analystLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'analyst-acceptance@test.com',
        password: 'password123',
      });
    analystToken = analystLoginRes.body.access_token;

    // Create client
    const client = await prisma.client.create({
      data: {
        name: 'Acceptance Test Client',
        contactName: 'Test Contact',
        email: 'client@test.com',
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
    clientId = client.id;

    // Create job
    const job = await prisma.job.create({
      data: {
        jobNumber: `JOB-ACCEPT-${Date.now()}`,
        clientId: clientId,
        status: 'ACTIVE',
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
    jobId = job.id;

    // Create sample
    const sample = await prisma.sample.create({
      data: {
        sampleCode: `SAMPLE-ACCEPT-${Date.now()}`,
        jobId: jobId,
        clientId: clientId,
        sampleDescription: 'Acceptance Test Sample',
        temperatureOnReceiptC: 5.0,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
    sampleId = sample.id;

    // Create method, specification, section, and test definition
    const method = await prisma.method.create({
      data: {
        code: `METHOD-ACCEPT-${Date.now()}`,
        name: 'Acceptance Test Method',
        unit: 'CFU/g',
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });

    const specification = await prisma.specification.create({
      data: {
        code: `SPEC-ACCEPT-${Date.now()}`,
        name: 'Acceptance Test Spec',
        min: 0,
        max: 100,
        unit: 'CFU/g',
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });

    const section = await prisma.section.create({
      data: {
        name: `Section-Accept-${Date.now()}`,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });

    const testDefinition = await prisma.testDefinition.create({
      data: {
        name: 'Acceptance Test Definition',
        sectionId: section.id,
        methodId: method.id,
        specificationId: specification.id,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
    testDefinitionId = testDefinition.id;

    // Create test assignment
    const testAssignment = await prisma.testAssignment.create({
      data: {
        sampleId: sampleId,
        testDefinitionId: testDefinitionId,
        sectionId: section.id,
        methodId: method.id,
        specificationId: specification.id,
        status: 'COMPLETED',
        result: '50',
        resultUnit: 'CFU/g',
        testDate: new Date(),
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });
    testAssignmentId = testAssignment.id;
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    try {
      // Delete in reverse order of dependencies
      await prisma.auditLog.deleteMany({
        where: {
          actorId: { in: [adminUserId, managerUserId, analystUserId] },
        },
      });
      await prisma.cOAReport.deleteMany({ where: { sampleId } });
      await prisma.testAssignment.deleteMany({ where: { sampleId } });
      await prisma.sample.deleteMany({ where: { id: sampleId } });
      await prisma.job.deleteMany({ where: { id: jobId } });
      await prisma.client.deleteMany({ where: { id: clientId } });
      await prisma.testDefinition.deleteMany({
        where: { id: testDefinitionId },
      });
      await prisma.section.deleteMany({
        where: {
          createdById: { in: [adminUserId, managerUserId, analystUserId] },
        },
      });
      await prisma.specification.deleteMany({
        where: {
          createdById: { in: [adminUserId, managerUserId, analystUserId] },
        },
      });
      await prisma.method.deleteMany({
        where: {
          createdById: { in: [adminUserId, managerUserId, analystUserId] },
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [adminUserId, managerUserId, analystUserId] } },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Scenario: Exporting a COA creates versioned, immutable report
   *
   * Given a Sample with released TestAssignments
   * When the Analyst exports a COA
   * Then a COAReport with version = 1 exists with dataSnapshot and pdfKey
   * And the PDF is downloadable
   * When a result is later edited and a new COA is exported
   * Then a COAReport with version = 2 exists and version 1 is marked superseded
   * And both PDFs are unchanged across time
   */
  describe('Scenario: Exporting a COA creates versioned, immutable report', () => {
    let coaVersion1Id: string;
    let coaVersion2Id: string;
    let pdfVersion1Size: number;
    let pdfVersion2Size: number;

    it('Given a Sample with released TestAssignments', async () => {
      // Update test assignment to RELEASED status
      await prisma.testAssignment.update({
        where: { id: testAssignmentId },
        data: { status: 'RELEASED' },
      });

      // Verify sample exists with released test
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
        include: { testAssignments: true },
      });

      expect(sample).toBeDefined();
      expect(sample.testAssignments.length).toBeGreaterThan(0);
      expect(sample.testAssignments[0].status).toBe('RELEASED');
    });

    it('When the Manager exports a COA - Then a COAReport with version = 1 exists with dataSnapshot and pdfKey', async () => {
      const response = await request(app.getHttpServer())
        .post(`/samples/${sampleId}/coa/export`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(201);

      const coaReport = response.body;
      coaVersion1Id = coaReport.id;

      expect(coaReport).toBeDefined();
      expect(coaReport.version).toBe(1);
      expect(coaReport.status).toBe('FINAL');
      expect(coaReport.dataSnapshot).toBeDefined();
      expect(coaReport.pdfKey).toBeDefined();
      expect(coaReport.pdfKey).toContain('.pdf');
    });

    it('And the PDF is downloadable', async () => {
      const response = await request(app.getHttpServer())
        .get(`/coa/${coaVersion1Id}/download`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body).toBeDefined();
      pdfVersion1Size = response.body.length;
      expect(pdfVersion1Size).toBeGreaterThan(0);
    });

    it('When a result is later edited and a new COA is exported', async () => {
      // Update test assignment result
      await request(app.getHttpServer())
        .put(`/tests/${testAssignmentId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          result: '75', // Changed from 50 to 75
        })
        .expect(200);

      // Export new COA version
      const response = await request(app.getHttpServer())
        .post(`/samples/${sampleId}/coa/export`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(201);

      coaVersion2Id = response.body.id;
      expect(response.body.version).toBe(2);
      expect(response.body.status).toBe('FINAL');
    });

    it('Then a COAReport with version = 2 exists and version 1 is marked superseded', async () => {
      // List all COA versions
      const response = await request(app.getHttpServer())
        .get(`/samples/${sampleId}/coa`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const versions = response.body;
      expect(versions.length).toBe(2);

      // Find version 1 and version 2
      const version1 = versions.find((v) => v.version === 1);
      const version2 = versions.find((v) => v.version === 2);

      expect(version1).toBeDefined();
      expect(version1.status).toBe('SUPERSEDED');
      expect(version1.id).toBe(coaVersion1Id);

      expect(version2).toBeDefined();
      expect(version2.status).toBe('FINAL');
      expect(version2.id).toBe(coaVersion2Id);
    });

    it('And both PDFs are unchanged across time (immutability)', async () => {
      // Download version 1 PDF again
      const v1Response1 = await request(app.getHttpServer())
        .get(`/coa/${coaVersion1Id}/download`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(v1Response1.body.length).toBe(pdfVersion1Size);

      // Download version 1 PDF a second time
      const v1Response2 = await request(app.getHttpServer())
        .get(`/coa/${coaVersion1Id}/download`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(v1Response2.body.length).toBe(pdfVersion1Size);

      // Download version 2 PDF
      const v2Response1 = await request(app.getHttpServer())
        .get(`/coa/${coaVersion2Id}/download`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      pdfVersion2Size = v2Response1.body.length;
      expect(pdfVersion2Size).toBeGreaterThan(0);

      // Download version 2 PDF again
      const v2Response2 = await request(app.getHttpServer())
        .get(`/coa/${coaVersion2Id}/download`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(v2Response2.body.length).toBe(pdfVersion2Size);

      // PDFs should be identical across downloads
      expect(v1Response1.body).toEqual(v1Response2.body);
      expect(v2Response1.body).toEqual(v2Response2.body);
    });
  });

  /**
   * Scenario: All changes are audited
   *
   * Given a Sample exists
   * When a user updates "temperatureOnReceiptC" from 5 to 8
   * Then an AuditLog entry exists with changes.temperatureOnReceiptC.old = 5 and new = 8
   * And actorId matches the user
   */
  describe('Scenario: All changes are audited', () => {
    let auditLogId: string;

    it('Given a Sample exists', async () => {
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
      });

      expect(sample).toBeDefined();
      expect(sample.temperatureOnReceiptC?.toNumber()).toBe(5.0);
    });

    it('When a user updates "temperatureOnReceiptC" from 5 to 8', async () => {
      await request(app.getHttpServer())
        .put(`/samples/${sampleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          temperatureOnReceiptC: 8.0,
        })
        .expect(200);

      // Verify update was successful
      const updatedSample = await prisma.sample.findUnique({
        where: { id: sampleId },
      });

      expect(updatedSample.temperatureOnReceiptC?.toNumber()).toBe(8.0);
    });

    it('Then an AuditLog entry exists with changes.temperatureOnReceiptC.old = 5 and new = 8', async () => {
      // Query audit logs for the sample
      const response = await request(app.getHttpServer())
        .get(`/audit?table=Sample&recordId=${sampleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const auditData = response.body;
      expect(auditData.logs).toBeDefined();
      expect(auditData.logs.length).toBeGreaterThan(0);

      // Find the UPDATE action with temperatureOnReceiptC change

      const tempUpdateLog = auditData.logs.find((log: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return (
          log.action === 'UPDATE' &&
          log.changes &&
          log.changes.temperatureOnReceiptC
        );
      });

      expect(tempUpdateLog).toBeDefined();
      auditLogId = tempUpdateLog.id;

      // Verify the old and new values
      expect(tempUpdateLog.changes.temperatureOnReceiptC.old).toBe('5');
      expect(tempUpdateLog.changes.temperatureOnReceiptC.new).toBe('8');
    });

    it('And actorId matches the user', async () => {
      // Get the audit log entry
      const response = await request(app.getHttpServer())
        .get(`/audit/${auditLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const auditLog = response.body;
      expect(auditLog.actorId).toBe(adminUserId);
      expect(auditLog.actorEmail).toBe('admin-acceptance@test.com');
    });
  });

  /**
   * Scenario: RBAC prevents unauthorized release
   *
   * Given a user with Analyst role
   * When they POST /samples/:id/release
   * Then the API responds 403 Forbidden
   */
  describe('Scenario: RBAC prevents unauthorized release', () => {
    it('Given a user with Analyst role', () => {
      // Analyst user was created in setupTestData
      expect(analystToken).toBeDefined();
    });

    it('When they POST /samples/:id/release - Then the API responds 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/samples/${sampleId}/release`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(403);
    });

    it('Verify LAB_MANAGER role can release samples (positive test)', async () => {
      await request(app.getHttpServer())
        .post(`/samples/${sampleId}/release`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Verify sample is now released
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
      });

      expect(sample.released).toBe(true);
      expect(sample.releaseDate).toBeDefined();
    });
  });
});
