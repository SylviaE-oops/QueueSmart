-- Migration: 002_seed_users.sql
-- Description: Seed database with initial test users
-- Created: 2026-04-24

-- Insert test users
INSERT IGNORE INTO users (id, full_name, email, password_hash, role) VALUES
  (1, 'John User', 'user@cougarnet.uh.edu', 'password', 'user'),
  (2, 'Jane Admin', 'admin@uh.edu', 'password', 'admin'),
  (3, 'Bob Smith', 'bob@cougarnet.uh.edu', 'password', 'user'),
  (4, 'Alice Johnson', 'alice@cougarnet.uh.edu', 'password', 'user');
