-- Database initialization script for 13Rooms
-- This script is automatically executed when the MySQL container starts for the first time
-- It creates the necessary tables and optionally seeds some initial data

-- Use the 13rooms database
USE 13rooms;

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_capacity (capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time),
    INDEX idx_room_time (room_id, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Insert sample rooms data
-- Uncomment the following lines to seed the database with initial rooms
/*
INSERT INTO rooms (name, capacity, status) VALUES
    ('Conference Room A', 10, 'available'),
    ('Conference Room B', 8, 'available'),
    ('Meeting Room 1', 4, 'available'),
    ('Meeting Room 2', 4, 'available'),
    ('Board Room', 20, 'available'),
    ('Training Room', 15, 'available'),
    ('Small Office', 2, 'available'),
    ('Team Room 1', 6, 'available'),
    ('Team Room 2', 6, 'available'),
    ('Executive Suite', 12, 'available');
*/

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON 13rooms.* TO '13rooms_user'@'%';
FLUSH PRIVILEGES;
