USE queuesmart_new;

INSERT INTO services (name, description, expected_duration_min, priority, is_open, stock_quantity, pickup_location)
VALUES
('Campus Bookstore Pickup', 'Pick up your textbook orders at the Campus Bookstore.', 4, 'medium', TRUE, 42, 'Campus Bookstore'),
('Library Pickup', 'Pick up reserved textbooks at the Main Library desk.', 3, 'low', TRUE, 18, 'Main Library'),
('Law Center Pickup', 'Pickup desk for law textbooks and course packets.', 5, 'high', FALSE, 0, 'Law Center')
ON DUPLICATE KEY UPDATE name = VALUES(name);
