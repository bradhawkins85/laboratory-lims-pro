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
  const client = await prisma.user.upsert({
    where: { email: 'client@lims.local' },
    update: {},
    create: {
      email: 'client@lims.local',
      password: clientPassword,
      name: 'Client Portal User',
      role: Role.CLIENT,
    },
  });
  console.log('✅ Client user created:', client.email);

  // Create sample data assigned to analyst and owned by client
  const sample1 = await prisma.sample.create({
    data: {
      sampleId: 'SAMPLE-001',
      type: 'Blood',
      userId: admin.id,
      assignedUserId: analyst.id,
      clientId: client.id,
      metadata: {
        patientId: 'PAT-12345',
        collectionDate: new Date().toISOString(),
        priority: 'normal',
        accountingFields: {
          poNumber: 'PO-2025-001',
          soNumber: 'SO-2025-001',
          quoteNumber: 'Q-2025-001',
          invoiceFlag: false,
        },
      },
    },
  });
  console.log('✅ Sample created:', sample1.sampleId);

  // Create test for the sample
  const test1 = await prisma.test.create({
    data: {
      testName: 'Complete Blood Count',
      sampleId: sample1.id,
      userId: analyst.id,
      metadata: {
        testCode: 'CBC-001',
        parameters: ['WBC', 'RBC', 'Platelets'],
      },
    },
  });
  console.log('✅ Test created:', test1.testName);

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Test Users:');
  console.log('  - Admin: admin@lims.local / admin123');
  console.log('  - Lab Manager: manager@lims.local / manager123');
  console.log('  - Analyst: analyst@lims.local / analyst123');
  console.log('  - Sales/Accounting: sales@lims.local / sales123');
  console.log('  - Client: client@lims.local / client123');
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
