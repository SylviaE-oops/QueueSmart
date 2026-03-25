const mysql = require('mysql2/promise');
require('dotenv').config();

// Migration runner
async function runMigration(migrationPath) {
  try {
    require(migrationPath);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

// Run all migrations
async function runAllMigrations() {
  const migrations = [
    './001_initial_setup'
  ];

  for (const migration of migrations) {
    console.log(`\nRunning: ${migration}`);
    await runMigration(migration);
  }

  console.log('\n✓ All migrations completed!');
  process.exit(0);
}

// Execute if this file is run directly
if (require.main === module) {
  runAllMigrations();
}

module.exports = { runAllMigrations, runMigration };
