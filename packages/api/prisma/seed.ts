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

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@lims.local' },
    update: {},
    create: {
      email: 'manager@lims.local',
      password: managerPassword,
      name: 'Lab Manager',
      role: Role.MANAGER,
    },
  });
  console.log('✅ Manager user created:', manager.email);

  // Create technician user
  const techPassword = await bcrypt.hash('tech123', 10);
  const technician = await prisma.user.upsert({
    where: { email: 'tech@lims.local' },
    update: {},
    create: {
      email: 'tech@lims.local',
      password: techPassword,
      name: 'Lab Technician',
      role: Role.TECHNICIAN,
    },
  });
  console.log('✅ Technician user created:', technician.email);

  // Create sample data
  const sample1 = await prisma.sample.create({
    data: {
      sampleId: 'SAMPLE-001',
      type: 'Blood',
      userId: technician.id,
      metadata: {
        patientId: 'PAT-12345',
        collectionDate: new Date().toISOString(),
        priority: 'normal',
      },
    },
  });
  console.log('✅ Sample created:', sample1.sampleId);

  // Create test for the sample
  const test1 = await prisma.test.create({
    data: {
      testName: 'Complete Blood Count',
      sampleId: sample1.id,
      userId: technician.id,
      metadata: {
        testCode: 'CBC-001',
        parameters: ['WBC', 'RBC', 'Platelets'],
      },
    },
  });
  console.log('✅ Test created:', test1.testName);

  console.log('🎉 Database seeding completed!');
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
