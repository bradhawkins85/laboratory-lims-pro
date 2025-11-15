import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lims.local' },
    update: {},
    create: {
      email: 'admin@lims.local',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create lab manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@lims.local' },
    update: {},
    create: {
      email: 'manager@lims.local',
      password: managerPassword,
      name: 'Lab Manager',
      role: Role.LAB_MANAGER,
    },
  });
  console.log('✅ Lab Manager user created:', manager.email);

  // Create analyst user
  const analystPassword = await bcrypt.hash('analyst123', 10);
  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@lims.local' },
    update: {},
    create: {
      email: 'analyst@lims.local',
      password: analystPassword,
      name: 'Lab Analyst',
      role: Role.ANALYST,
    },
  });
  console.log('✅ Analyst user created:', analyst.email);

  // Create sales/accounting user
  const salesPassword = await bcrypt.hash('sales123', 10);
  const sales = await prisma.user.upsert({
    where: { email: 'sales@lims.local' },
    update: {},
    create: {
      email: 'sales@lims.local',
      password: salesPassword,
      name: 'Sales Representative',
      role: Role.SALES_ACCOUNTING,
    },
  });
  console.log('✅ Sales/Accounting user created:', sales.email);

  // Create client user
  const clientPassword = await bcrypt.hash('client123', 10);
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@lims.local' },
    update: {},
    create: {
      email: 'client@lims.local',
      password: clientPassword,
      name: 'Client Portal User',
      role: Role.CLIENT,
    },
  });
  console.log('✅ Client user created:', clientUser.email);

  // === MASTER DATA ===
  
  // Create Client entity
  const client = await prisma.client.create({
    data: {
      name: 'Acme Pharmaceuticals',
      contactName: 'John Smith',
      email: 'john.smith@acme.com',
      phone: '+1-555-0123',
      address: '123 Pharma Street, Medical City, MC 12345',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ Client created:', client.name);

  // Create Sections
  const microSection = await prisma.section.create({
    data: {
      name: 'Microbiology',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const chemSection = await prisma.section.create({
    data: {
      name: 'Chemistry',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const physSection = await prisma.section.create({
    data: {
      name: 'Physical Testing',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ Sections created');

  // Create Methods
  const tpcMethod = await prisma.method.create({
    data: {
      code: 'MET-001',
      name: 'Total Plate Count',
      description: 'Enumeration of aerobic mesophilic bacteria',
      unit: 'CFU/g',
      lod: 1.0,
      loq: 10.0,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const yeastMouldMethod = await prisma.method.create({
    data: {
      code: 'MET-002',
      name: 'Yeast and Mould Count',
      description: 'Enumeration of yeast and moulds',
      unit: 'CFU/g',
      lod: 1.0,
      loq: 10.0,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const ecoliMethod = await prisma.method.create({
    data: {
      code: 'MET-003',
      name: 'E. coli Detection',
      description: 'Detection of E. coli',
      unit: 'CFU/g',
      lod: 1.0,
      loq: 10.0,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const salmonellaMethod = await prisma.method.create({
    data: {
      code: 'MET-004',
      name: 'Salmonella Detection',
      description: 'Detection of Salmonella species',
      unit: 'detected/not detected',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const staphMethod = await prisma.method.create({
    data: {
      code: 'MET-005',
      name: 'Staphylococcus aureus Count',
      description: 'Enumeration of Staphylococcus aureus',
      unit: 'CFU/g',
      lod: 1.0,
      loq: 10.0,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const pseudomonasMethod = await prisma.method.create({
    data: {
      code: 'MET-006',
      name: 'Pseudomonas aeruginosa Detection',
      description: 'Detection of Pseudomonas aeruginosa',
      unit: 'CFU/g',
      lod: 1.0,
      loq: 10.0,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const leadMethod = await prisma.method.create({
    data: {
      code: 'MET-007',
      name: 'Lead (Pb) Analysis',
      description: 'ICP-MS analysis for lead',
      unit: 'ppm',
      lod: 0.01,
      loq: 0.05,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const cadmiumMethod = await prisma.method.create({
    data: {
      code: 'MET-008',
      name: 'Cadmium (Cd) Analysis',
      description: 'ICP-MS analysis for cadmium',
      unit: 'ppm',
      lod: 0.01,
      loq: 0.05,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const arsenicMethod = await prisma.method.create({
    data: {
      code: 'MET-009',
      name: 'Arsenic (As) Analysis',
      description: 'ICP-MS analysis for arsenic',
      unit: 'ppm',
      lod: 0.01,
      loq: 0.05,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const mercuryMethod = await prisma.method.create({
    data: {
      code: 'MET-010',
      name: 'Mercury (Hg) Analysis',
      description: 'ICP-MS analysis for mercury',
      unit: 'ppm',
      lod: 0.01,
      loq: 0.05,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const phMethod = await prisma.method.create({
    data: {
      code: 'MET-011',
      name: 'pH Measurement',
      description: 'pH determination using pH meter',
      unit: 'pH',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const viscosityMethod = await prisma.method.create({
    data: {
      code: 'MET-012',
      name: 'Viscosity Measurement',
      description: 'Viscosity determination using viscometer',
      unit: 'cP',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const densityMethod = await prisma.method.create({
    data: {
      code: 'MET-013',
      name: 'Density Measurement',
      description: 'Density determination using densitometer',
      unit: 'g/mL',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const refractiveIndexMethod = await prisma.method.create({
    data: {
      code: 'MET-014',
      name: 'Refractive Index Measurement',
      description: 'Refractive index determination using refractometer',
      unit: 'nD',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  console.log('✅ Methods created');

  // Create Specifications
  const tpcSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-001',
      name: 'TPC Limit',
      target: '< 1000',
      max: 1000.0,
      unit: 'CFU/g',
      oosRule: 'result > 1000',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const yeastMouldSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-002',
      name: 'Yeast & Mould Limit',
      target: '< 100',
      max: 100.0,
      unit: 'CFU/g',
      oosRule: 'result > 100',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const ecoliSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-003',
      name: 'E. coli Limit',
      target: '< 10',
      max: 10.0,
      unit: 'CFU/g',
      oosRule: 'result > 10',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const salmonellaSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-004',
      name: 'Salmonella Absence',
      target: 'Not Detected',
      oosRule: 'result = "Detected"',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const staphSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-005',
      name: 'S. aureus Limit',
      target: '< 100',
      max: 100.0,
      unit: 'CFU/g',
      oosRule: 'result > 100',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const pseudomonasSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-006',
      name: 'P. aeruginosa Limit',
      target: '< 10',
      max: 10.0,
      unit: 'CFU/g',
      oosRule: 'result > 10',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const leadSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-007',
      name: 'Lead (Pb) Limit',
      target: '< 0.5',
      max: 0.5,
      unit: 'ppm',
      oosRule: 'result > 0.5',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const cadmiumSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-008',
      name: 'Cadmium (Cd) Limit',
      target: '< 0.3',
      max: 0.3,
      unit: 'ppm',
      oosRule: 'result > 0.3',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const arsenicSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-009',
      name: 'Arsenic (As) Limit',
      target: '< 1.0',
      max: 1.0,
      unit: 'ppm',
      oosRule: 'result > 1.0',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const mercurySpec = await prisma.specification.create({
    data: {
      code: 'SPEC-010',
      name: 'Mercury (Hg) Limit',
      target: '< 0.1',
      max: 0.1,
      unit: 'ppm',
      oosRule: 'result > 0.1',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const phSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-011',
      name: 'pH Range',
      target: '5.0 - 7.0',
      min: 5.0,
      max: 7.0,
      unit: 'pH',
      oosRule: 'result < 5.0 || result > 7.0',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const viscositySpec = await prisma.specification.create({
    data: {
      code: 'SPEC-012',
      name: 'Viscosity Range',
      target: '50 - 150',
      min: 50.0,
      max: 150.0,
      unit: 'cP',
      oosRule: 'result < 50.0 || result > 150.0',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const densitySpec = await prisma.specification.create({
    data: {
      code: 'SPEC-013',
      name: 'Density Range',
      target: '0.95 - 1.05',
      min: 0.95,
      max: 1.05,
      unit: 'g/mL',
      oosRule: 'result < 0.95 || result > 1.05',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const refractiveIndexSpec = await prisma.specification.create({
    data: {
      code: 'SPEC-014',
      name: 'Refractive Index Range',
      target: '1.330 - 1.340',
      min: 1.330,
      max: 1.340,
      unit: 'nD',
      oosRule: 'result < 1.330 || result > 1.340',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  console.log('✅ Specifications created');

  // Create Test Definitions
  // Microbiology tests
  const tpcTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Total Plate Count',
      sectionId: microSection.id,
      methodId: tpcMethod.id,
      specificationId: tpcSpec.id,
      defaultDueDays: 5,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const yeastMouldTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Yeast and Mould Count',
      sectionId: microSection.id,
      methodId: yeastMouldMethod.id,
      specificationId: yeastMouldSpec.id,
      defaultDueDays: 5,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const ecoliTestDef = await prisma.testDefinition.create({
    data: {
      name: 'E. coli Detection',
      sectionId: microSection.id,
      methodId: ecoliMethod.id,
      specificationId: ecoliSpec.id,
      defaultDueDays: 3,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const salmonellaTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Salmonella Detection',
      sectionId: microSection.id,
      methodId: salmonellaMethod.id,
      specificationId: salmonellaSpec.id,
      defaultDueDays: 5,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const staphTestDef = await prisma.testDefinition.create({
    data: {
      name: 'S. aureus Count',
      sectionId: microSection.id,
      methodId: staphMethod.id,
      specificationId: staphSpec.id,
      defaultDueDays: 3,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const pseudomonasTestDef = await prisma.testDefinition.create({
    data: {
      name: 'P. aeruginosa Detection',
      sectionId: microSection.id,
      methodId: pseudomonasMethod.id,
      specificationId: pseudomonasSpec.id,
      defaultDueDays: 3,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  // Heavy metals tests
  const leadTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Lead (Pb) Analysis',
      sectionId: chemSection.id,
      methodId: leadMethod.id,
      specificationId: leadSpec.id,
      defaultDueDays: 7,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const cadmiumTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Cadmium (Cd) Analysis',
      sectionId: chemSection.id,
      methodId: cadmiumMethod.id,
      specificationId: cadmiumSpec.id,
      defaultDueDays: 7,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const arsenicTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Arsenic (As) Analysis',
      sectionId: chemSection.id,
      methodId: arsenicMethod.id,
      specificationId: arsenicSpec.id,
      defaultDueDays: 7,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const mercuryTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Mercury (Hg) Analysis',
      sectionId: chemSection.id,
      methodId: mercuryMethod.id,
      specificationId: mercurySpec.id,
      defaultDueDays: 7,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  // Physical tests
  const phTestDef = await prisma.testDefinition.create({
    data: {
      name: 'pH Measurement',
      sectionId: physSection.id,
      methodId: phMethod.id,
      specificationId: phSpec.id,
      defaultDueDays: 2,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const viscosityTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Viscosity Measurement',
      sectionId: physSection.id,
      methodId: viscosityMethod.id,
      specificationId: viscositySpec.id,
      defaultDueDays: 2,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const densityTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Density Measurement',
      sectionId: physSection.id,
      methodId: densityMethod.id,
      specificationId: densitySpec.id,
      defaultDueDays: 2,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  const refractiveIndexTestDef = await prisma.testDefinition.create({
    data: {
      name: 'Refractive Index Measurement',
      sectionId: physSection.id,
      methodId: refractiveIndexMethod.id,
      specificationId: refractiveIndexSpec.id,
      defaultDueDays: 2,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  
  console.log('✅ Test Definitions created');

  // Create Test Packs
  const basic6MicroPack = await prisma.testPack.create({
    data: {
      name: 'Basic 6 Micro Tests',
      createdById: admin.id,
      updatedById: admin.id,
      items: {
        create: [
          { order: 1, testDefinitionId: tpcTestDef.id },
          { order: 2, testDefinitionId: yeastMouldTestDef.id },
          { order: 3, testDefinitionId: ecoliTestDef.id },
          { order: 4, testDefinitionId: salmonellaTestDef.id },
          { order: 5, testDefinitionId: staphTestDef.id },
          { order: 6, testDefinitionId: pseudomonasTestDef.id },
        ],
      },
    },
  });
  
  const heavyMetalsPack = await prisma.testPack.create({
    data: {
      name: '4× Heavy Metals',
      createdById: admin.id,
      updatedById: admin.id,
      items: {
        create: [
          { order: 1, testDefinitionId: leadTestDef.id },
          { order: 2, testDefinitionId: cadmiumTestDef.id },
          { order: 3, testDefinitionId: arsenicTestDef.id },
          { order: 4, testDefinitionId: mercuryTestDef.id },
        ],
      },
    },
  });
  
  const liquidPhysicalPack = await prisma.testPack.create({
    data: {
      name: '4× Liquid Physical',
      createdById: admin.id,
      updatedById: admin.id,
      items: {
        create: [
          { order: 1, testDefinitionId: phTestDef.id },
          { order: 2, testDefinitionId: viscosityTestDef.id },
          { order: 3, testDefinitionId: densityTestDef.id },
          { order: 4, testDefinitionId: refractiveIndexTestDef.id },
        ],
      },
    },
  });
  
  const tvcYeastMouldPack = await prisma.testPack.create({
    data: {
      name: 'TVC & Yeast & Mould Pack',
      createdById: admin.id,
      updatedById: admin.id,
      items: {
        create: [
          { order: 1, testDefinitionId: tpcTestDef.id },
          { order: 2, testDefinitionId: yeastMouldTestDef.id },
        ],
      },
    },
  });
  
  console.log('✅ Test Packs created:', basic6MicroPack.name, heavyMetalsPack.name, liquidPhysicalPack.name, tvcYeastMouldPack.name);

  // === OPERATIONAL DATA ===
  
  // Create Job
  const job = await prisma.job.create({
    data: {
      jobNumber: 'JOB-2025-001',
      needByDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'ACTIVE',
      clientId: client.id,
      quoteNumber: 'Q-2025-001',
      poNumber: 'PO-2025-001',
      soNumber: 'SO-2025-001',
      amountExTax: 1500.00,
      invoiced: false,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ Job created:', job.jobNumber);

  // Create Sample 1
  const sample1 = await prisma.sample.create({
    data: {
      sampleCode: 'SAMPLE-001',
      dateReceived: new Date(),
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      sampleDescription: 'Raw material batch for testing',
      sampleBatch: 'BATCH-2025-001',
      temperatureOnReceiptC: 22.5,
      storageConditions: 'Room temperature, dry',
      jobId: job.id,
      clientId: client.id,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ Sample 1 created:', sample1.sampleCode);

  // Create Sample 2
  const sample2 = await prisma.sample.create({
    data: {
      sampleCode: 'SAMPLE-002',
      dateReceived: new Date(),
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      sampleDescription: 'Finished product quality control',
      sampleBatch: 'BATCH-2025-002',
      temperatureOnReceiptC: 21.8,
      storageConditions: 'Room temperature, dry',
      jobId: job.id,
      clientId: client.id,
      urgent: true,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ Sample 2 created:', sample2.sampleCode);

  // Create Test Assignments for Sample 1 (some with results, some OOS)
  const testAssignment1 = await prisma.testAssignment.create({
    data: {
      sampleId: sample1.id,
      sectionId: microSection.id,
      methodId: tpcMethod.id,
      specificationId: tpcSpec.id,
      testDefinitionId: tpcTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '850',
      resultUnit: 'CFU/g',
      oos: false,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment2 = await prisma.testAssignment.create({
    data: {
      sampleId: sample1.id,
      sectionId: microSection.id,
      methodId: yeastMouldMethod.id,
      specificationId: yeastMouldSpec.id,
      testDefinitionId: yeastMouldTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '45',
      resultUnit: 'CFU/g',
      oos: false,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment3 = await prisma.testAssignment.create({
    data: {
      sampleId: sample1.id,
      sectionId: chemSection.id,
      methodId: leadMethod.id,
      specificationId: leadSpec.id,
      testDefinitionId: leadTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '0.75',
      resultUnit: 'ppm',
      oos: true, // OOS - exceeds limit of 0.5 ppm
      comments: 'Result exceeds specification limit',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment4 = await prisma.testAssignment.create({
    data: {
      sampleId: sample1.id,
      sectionId: physSection.id,
      methodId: phMethod.id,
      specificationId: phSpec.id,
      testDefinitionId: phTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '6.2',
      resultUnit: 'pH',
      oos: false,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  // Create Test Assignments for Sample 2 (some with results, some OOS)
  const testAssignment5 = await prisma.testAssignment.create({
    data: {
      sampleId: sample2.id,
      sectionId: microSection.id,
      methodId: tpcMethod.id,
      specificationId: tpcSpec.id,
      testDefinitionId: tpcTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '1500',
      resultUnit: 'CFU/g',
      oos: true, // OOS - exceeds limit of 1000 CFU/g
      comments: 'Result exceeds specification limit - retest recommended',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment6 = await prisma.testAssignment.create({
    data: {
      sampleId: sample2.id,
      sectionId: microSection.id,
      methodId: salmonellaMethod.id,
      specificationId: salmonellaSpec.id,
      testDefinitionId: salmonellaTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: 'Not Detected',
      resultUnit: 'detected/not detected',
      oos: false,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment7 = await prisma.testAssignment.create({
    data: {
      sampleId: sample2.id,
      sectionId: physSection.id,
      methodId: viscosityMethod.id,
      specificationId: viscositySpec.id,
      testDefinitionId: viscosityTestDef.id,
      analystId: analyst.id,
      status: 'COMPLETED',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      testDate: new Date(),
      result: '180',
      resultUnit: 'cP',
      oos: true, // OOS - exceeds max of 150 cP
      comments: 'Viscosity exceeds upper specification limit',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const testAssignment8 = await prisma.testAssignment.create({
    data: {
      sampleId: sample2.id,
      sectionId: physSection.id,
      methodId: densityMethod.id,
      specificationId: densitySpec.id,
      testDefinitionId: densityTestDef.id,
      analystId: analyst.id,
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  console.log('✅ Test Assignments created with results (3 OOS entries)');

  // Create Attachment
  const attachment = await prisma.attachment.create({
    data: {
      fileName: 'sample_image.jpg',
      fileUrl: 's3://lims-files/samples/sample-001/image.jpg',
      fileSize: 204800,
      mimeType: 'image/jpeg',
      sampleId: sample1.id,
      createdById: analyst.id,
      updatedById: analyst.id,
    },
  });
  console.log('✅ Attachment created:', attachment.fileName);

  // Create COA Report
  const coaReport = await prisma.cOAReport.create({
    data: {
      sampleId: sample1.id,
      version: 1,
      status: 'DRAFT',
      dataSnapshot: {
        sampleCode: sample1.sampleCode,
        clientName: client.name,
        tests: [
          {
            testName: tpcTestDef.name,
            method: tpcMethod.name,
            result: '850',
          },
        ],
      },
      createdById: analyst.id,
      updatedById: analyst.id,
    },
  });
  console.log('✅ COA Report created');

  // Create Audit Log entry
  const auditLog = await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'CREATE',
      table: 'Sample',
      recordId: sample1.id,
      changes: {
        sampleCode: { old: null, new: sample1.sampleCode },
        status: { old: null, new: 'created' },
      },
      at: new Date(),
    },
  });
  console.log('✅ Audit Log entry created');

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Test Users:');
  console.log('  - Admin: admin@lims.local / admin123');
  console.log('  - Lab Manager: manager@lims.local / manager123');
  console.log('  - Analyst: analyst@lims.local / analyst123');
  console.log('  - Sales/Accounting: sales@lims.local / sales123');
  console.log('  - Client: client@lims.local / client123');
  console.log('\n📊 Sample Data:');
  console.log(`  - Client: ${client.name}`);
  console.log(`  - Job: ${job.jobNumber}`);
  console.log(`  - Sample 1: ${sample1.sampleCode}`);
  console.log(`  - Sample 2: ${sample2.sampleCode}`);
  console.log('\n🧪 Test Packs:');
  console.log(`  - ${basic6MicroPack.name} (6 micro tests)`);
  console.log(`  - ${heavyMetalsPack.name} (Pb, Cd, As, Hg)`);
  console.log(`  - ${liquidPhysicalPack.name} (pH, Viscosity, Density, Refractive Index)`);
  console.log(`  - ${tvcYeastMouldPack.name} (TVC & Yeast & Mould)`);
  console.log('\n⚠️ OOS Results:');
  console.log('  - Sample 1: Lead (Pb) = 0.75 ppm (limit: 0.5 ppm)');
  console.log('  - Sample 2: Total Plate Count = 1500 CFU/g (limit: 1000 CFU/g)');
  console.log('  - Sample 2: Viscosity = 180 cP (limit: 150 cP)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
