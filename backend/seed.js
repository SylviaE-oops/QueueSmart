const Service = require('./models/Service');
const User = require('./models/User');
const Queue = require('./models/Queue');
const database = require('./config/database');

const pool = database.pool || database;

async function resetDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM notifications');
    await connection.query('DELETE FROM history');
    await connection.query('DELETE FROM queue_entries');
    await connection.query('DELETE FROM services');
    await connection.query('DELETE FROM users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
}

async function seedDatabase() {
  try {
    console.log('\n🌱 Starting database seeding...\n');

    await resetDatabase();
    console.log('✓ Existing seed data cleared');

    console.log('📌 Creating services...');
    const service1 = await Service.create({
      name: 'Campus Bookstore Pickup',
      description: 'Pick up your textbook orders at the Campus Bookstore.',
      duration: 4,
      priority: 2,
      status: 'open'
    });

    const service2 = await Service.create({
      name: 'Library Pickup',
      description: 'Pick up reserved textbooks at the Main Library desk.',
      duration: 3,
      priority: 1,
      status: 'open'
    });

    const service3 = await Service.create({
      name: 'Law Center Pickup',
      description: 'Pickup desk for law textbooks and course packets.',
      duration: 5,
      priority: 3,
      status: 'closed'
    });

    console.log('✓ Services created:', [service1.id, service2.id, service3.id].join(', '));

    console.log('\n👥 Creating users...');
    const user1 = await User.create({
      email: 'user1@cougarnet.uh.edu',
      password: 'password',
      role: 'user'
    });

    const user2 = await User.create({
      email: 'student2@cougarnet.uh.edu',
      password: 'password123',
      role: 'user'
    });

    const admin = await User.create({
      email: 'admin@uh.edu',
      password: 'password',
      role: 'admin'
    });

    console.log('✓ Users created:', [user1.id, user2.id, admin.id].join(', '));

    console.log('\n📋 Creating queues...');
    await Queue.create({
      serviceId: service1.id,
      userId: user1.id,
      priority: 2,
      status: 'waiting'
    });

    await Queue.create({
      serviceId: service1.id,
      userId: user2.id,
      priority: 1,
      status: 'waiting'
    });

    await Queue.create({
      serviceId: service2.id,
      userId: user1.id,
      priority: 1,
      status: 'waiting'
    });

    console.log('\n✅ Database seeding completed successfully!');
    console.log('   Default login: user1@cougarnet.uh.edu / password');
    console.log('   Admin login: admin@uh.edu / password\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
