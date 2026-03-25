const Service = require('./models/Service');
const User = require('./models/User');
const Queue = require('./models/Queue');

async function seedDatabase() {
  try {
    console.log('\n🌱 Starting database seeding...\n');

    // Create Services
    console.log('📌 Creating services...');
    const service1 = await Service.create({
      name: 'Campus Bookstore Pickup',
      description: 'Pick up your textbook orders at the Campus Bookstore.',
      expectedDurationMin: 4,
      priority: 'medium',
      status: 'open'
    });
    console.log('✓ Service 1 created:', service1);

    const service2 = await Service.create({
      name: 'Library Pickup',
      description: 'Pick up reserved textbooks at the Main Library desk.',
      expectedDurationMin: 3,
      priority: 'low',
      status: 'open'
    });
    console.log('✓ Service 2 created:', service2);

    const service3 = await Service.create({
      name: 'Law Center Pickup',
      description: 'Pickup desk for law textbooks and course packets.',
      expectedDurationMin: 5,
      priority: 'high',
      status: 'closed'
    });
    console.log('✓ Service 3 created:', service3);

    // Create Users
    console.log('\n👥 Creating users...');
    const user1 = await User.create({
      email: 'student1@cougarnet.uh.edu',
      password: 'password123',
      role: 'user'
    });
    console.log('✓ User 1 created:', user1);

    const user2 = await User.create({
      email: 'student2@cougarnet.uh.edu',
      password: 'password123',
      role: 'user'
    });
    console.log('✓ User 2 created:', user2);

    const admin = await User.create({
      email: 'admin@uh.edu',
      password: 'admin123',
      role: 'admin'
    });
    console.log('✓ Admin created:', admin);

    // Create Queues
    console.log('\n📋 Creating queues...');
    const queue1 = await Queue.create({
      email: 'student1@cougarnet.uh.edu',
      serviceId: service1.id,
      position: 1,
      status: 'waiting'
    });
    console.log('✓ Queue 1 created:', queue1);

    const queue2 = await Queue.create({
      email: 'student2@cougarnet.uh.edu',
      serviceId: service1.id,
      position: 2,
      status: 'almost_ready'
    });
    console.log('✓ Queue 2 created:', queue2);

    const queue3 = await Queue.create({
      email: 'student1@cougarnet.uh.edu',
      serviceId: service2.id,
      position: 1,
      status: 'waiting'
    });
    console.log('✓ Queue 3 created:', queue3);

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Services created: 3');
    console.log('   - Users created: 3');
    console.log('   - Queues created: 3');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
