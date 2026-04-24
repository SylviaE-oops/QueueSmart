# Database Migrations

## Purpose
Migrations manage database schema changes in a version-controlled, repeatable way without needing to manually run SQL scripts.

## How to Run

From the `backend/` directory, run:
```bash
npm run migrate
```

This will execute all pending migrations in alphabetical order and track them in the `schema_migrations` table to prevent re-running.

## Migration Files
- `001_initial_schema.sql` - Creates base tables (users, services, queue_entries, notifications, history)
- `002_seed_users.sql` - Seeds test user data
- `003_book_requests.sql` - Creates `book_requests` table for student book request submissions

Add new migrations following the naming pattern: `003_description.sql`, `004_description.sql`, etc.
