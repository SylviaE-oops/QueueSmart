-- Migration: 003_book_requests.sql
-- Description: Add table for student textbook requests
-- Created: 2026-04-24

CREATE TABLE IF NOT EXISTS book_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_title VARCHAR(255) NOT NULL,
  author VARCHAR(255) DEFAULT NULL,
  isbn VARCHAR(30) DEFAULT NULL,
  course_code VARCHAR(50) DEFAULT NULL,
  notes TEXT,
  status ENUM('pending', 'approved', 'rejected', 'fulfilled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
