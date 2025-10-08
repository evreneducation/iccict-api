import { PrismaClient, AdminRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'; // You'll need this for password hashing

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // 1. Hash the password before saving
  const hashedPassword = await bcrypt.hash('iccict@12345', 10);

  // 2. Create the Admin record
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'admin@iccict.com' }, // Use upsert to prevent re-creation on subsequent runs
    update: {}, // No update needed if record exists, just ensure it's there
    create: {
      email: 'admin@iccict.com',
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN, // Assuming AdminRole is defined in your schema
      referralCode: 'PRISMAADM',
    },
  })

  console.log(`Created Super Admin with ID: ${superAdmin.id}`)
  
  // Add more seeding logic here for other tables if needed
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect() // Use disconnect for older versions, or $disconnect() for newer
  })