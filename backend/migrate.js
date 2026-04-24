require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'queuesmart_user',
  password: process.env.DB_PASSWORD || 'queuesmart123',
  database: process.env.DB_NAME || 'queuesmart',
  waitForConnections: true,
  connectionLimit: 10,
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getMigrationsRun(connection) {
  const [rows] = await connection.execute(
    'SELECT migration_name FROM schema_migrations ORDER BY executed_at ASC'
  );
  return rows.map((row) => row.migration_name);
}

async function recordMigration(connection, migrationName) {
  await connection.execute(
    'INSERT INTO schema_migrations (migration_name) VALUES (?)',
    [migrationName]
  );
}

async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(connection);

    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (!files.length) {
      console.log('No migration files found.');
      return;
    }

    // Get already-run migrations
    const ranMigrations = await getMigrationsRun(connection);

    // Run pending migrations
    let count = 0;
    for (const file of files) {
      if (ranMigrations.includes(file)) {
        console.log(`✓ Skipped (already run): ${file}`);
        continue;
      }

      console.log(`→ Running: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const stmt of statements) {
        await connection.execute(stmt);
      }

      // Record migration as run
      await recordMigration(connection, file);
      console.log(`✓ Completed: ${file}`);
      count += 1;
    }

    if (count === 0) {
      console.log('All migrations already run.');
    } else {
      console.log(`\n✓ Successfully ran ${count} migration(s).`);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
