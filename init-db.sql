-- Use the 13rooms database
CREATE DATABASE IF NOT EXISTS `13rooms` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `13rooms`;

-- Create the user table with correct syntax
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `firstname` VARCHAR(255) NOT NULL,
  `surname` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,               
  `role` ENUM('user','admin') NOT NULL DEFAULT 'user',   
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the room table with correct syntax
CREATE TABLE IF NOT EXISTS `room` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `capacity` INT NOT NULL,
  `status` ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
  `location` VARCHAR(255) DEFAULT NULL,
  `amenities` JSON DEFAULT NULL,
  `icon` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the booking table with correct syntax
CREATE TABLE IF NOT EXISTS `booking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `comment` TEXT,
  `created_by` INT DEFAULT NULL,  -- Nullable to support guest bookings
  `status` ENUM('confirmed','canceled') NOT NULL DEFAULT 'confirmed',
  `canceled_by` INT DEFAULT NULL,
  `canceled_reason` VARCHAR(255) DEFAULT NULL,
  `canceled_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_booking_room`       FOREIGN KEY (`room_id`)    REFERENCES `room`(`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_booking_created_by` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`)  ON DELETE SET NULL,  -- Changed to SET NULL to allow guests
  CONSTRAINT `fk_booking_canceled_by` FOREIGN KEY (`canceled_by`) REFERENCES `user`(`id`)  ON DELETE SET NULL,

  KEY `ix_booking_room_time` (`room_id`, `start_time`, `end_time`),
  KEY `ix_booking_creator_time` (`created_by`, `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create the activity_log table for audit trail
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action_type` ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT') NOT NULL,
  `entity_type` ENUM('BOOKING','ROOM','USER') NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `timestamp` DATETIME NOT NULL,

  CONSTRAINT `fk_activity_log_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,

  KEY `ix_activity_log_user` (`user_id`, `timestamp`),
  KEY `ix_activity_log_entity` (`entity_type`, `entity_id`, `timestamp`),
  KEY `ix_activity_log_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEFAULT ADMIN USER FOR DEVELOPMENT
-- ============================================================================
-- This creates a default admin account for local development and testing.
--
-- Credentials:
--   Email:    admin@13rooms.com
--   Password: admin123
--
-- SECURITY WARNING: Change or remove this user in production environments!
-- ============================================================================

-- Use INSERT IGNORE to prevent errors if the user already exists.
-- This makes the script safely re-runnable (idempotent).
INSERT IGNORE INTO `user` (email, firstname, surname, password_hash, role, is_active)
VALUES (
  'admin@13rooms.com',
  'Admin',
  'User',
  '120000:765c7e19c85c2201b2eae6f318afb3c8:cf73c681f67d7f06361a393193c56f885f7d131545b0c9273a0a94c0a7c2c31c0c7001f4cedac2fb8cdcf3cb88ab84d8682303ca1f2ae49846e9965533cf58b4',
  'admin',
  1
);
