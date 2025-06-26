import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('@_Kimunyi123!', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'jkkimunyi@gmail.com' },
    update: {},
    create: {
      email: 'jkkimunyi@gmail.com',
      password: hashedPassword,
      firstName: 'Jimmy',
      lastName: 'Kimunyi',
      phone: '+254113514156',
      dateOfBirth: new Date('2003-08-04'),
      role: Role.ADMIN,
      isActive: true,
      isVerified: true,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Add some sample vehicles
  const vehicles = [
    {
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      category: 'SEDAN',
      transmission: 'AUTOMATIC',
      fuelType: 'PETROL',
      seats: 5,
      doors: 4,
      color: 'White',
      licensePlate: 'KCA-001A',
      pricePerDay: 50.00,
      pricePerHour: 8.00,
      description: 'Comfortable sedan perfect for business trips',
      location: 'Nairobi, Kenya',
      features: ['Air Conditioning', 'Bluetooth', 'GPS', 'USB Charging'],
      images: ['https://example.com/camry1.jpg'],
    },
    {
      make: 'Honda',
      model: 'CR-V',
      year: 2022,
      category: 'SUV',
      transmission: 'AUTOMATIC',
      fuelType: 'PETROL',
      seats: 7,
      doors: 5,
      color: 'Black',
      licensePlate: 'KCB-002B',
      pricePerDay: 75.00,
      pricePerHour: 12.00,
      description: 'Spacious SUV ideal for family trips',
      location: 'Nairobi, Kenya',
      features: ['Air Conditioning', 'Bluetooth', 'GPS', 'Sunroof', '4WD'],
      images: ['https://example.com/crv1.jpg'],
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { licensePlate: vehicle.licensePlate },
      update: {},
      create: {
        ...vehicle,
        category: vehicle.category as any,
        transmission: vehicle.transmission as any,
        fuelType: vehicle.fuelType as any,
      },
    });
  }

  console.log('✅ Sample vehicles created');

  // Add sample coupons
  const coupons = [
    {
      code: 'WELCOME10',
      description: '10% off for new customers',
      discountType: 'percentage',
      discountValue: 10,
      minAmount: 100,
      maxDiscount: 50,
      usageLimit: 100,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      code: 'SAVE20',
      description: '$20 off bookings over $200',
      discountType: 'fixed',
      discountValue: 20,
      minAmount: 200,
      usageLimit: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
  }

  console.log('✅ Sample coupons created');
  console.log('🎉 Database seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });