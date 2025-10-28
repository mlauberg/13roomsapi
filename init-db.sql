-- Use the 13rooms database
USE 13rooms;

-- Create the room table with correct syntax
CREATE TABLE IF NOT EXISTS `room` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `capacity` INT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'available',
    `location` VARCHAR(255) DEFAULT NULL,
    `amenities` JSON DEFAULT NULL,
    `icon` VARCHAR(100) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the booking table with correct syntax
CREATE TABLE IF NOT EXISTS `booking` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `comment` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Insert sample room data (uncomment to use)
/*
INSERT INTO `room` (name, capacity, location, amenities, icon) VALUES
    ('Conference Room A', 10, 'Ground Floor', '["Whiteboard", "Projector"]', 'meeting_room'),
    ('Meeting Room 1', 4, '1st Floor', '["Whiteboard"]', 'group');
*/
