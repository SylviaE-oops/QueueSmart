-- Migration: 004_locations.sql
-- Description: Add locations table and update book_requests with new status flow + location assignment
-- Created: 2026-04-24

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) DEFAULT NULL,
  max_queues INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE book_requests
  MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'picked_up') NOT NULL DEFAULT 'pending',
  ADD COLUMN location_id INT DEFAULT NULL AFTER status,
  ADD COLUMN ready_at TIMESTAMP NULL DEFAULT NULL AFTER location_id,
  ADD COLUMN picked_up_at TIMESTAMP NULL DEFAULT NULL AFTER ready_at,
  ADD CONSTRAINT fk_book_requests_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
