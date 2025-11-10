-- Migration Script: Allow NULL values for created_by column to support guest bookings
-- Run this in your MySQL client (e.g., MySQL Workbench, phpMyAdmin, or mysql CLI)

USE `13rooms`;

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE `booking` DROP FOREIGN KEY `fk_booking_created_by`;

-- Step 2: Modify the created_by column to allow NULL values
ALTER TABLE `booking` MODIFY COLUMN `created_by` INT DEFAULT NULL;

-- Step 3: Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE `booking`
  ADD CONSTRAINT `fk_booking_created_by`
  FOREIGN KEY (`created_by`) REFERENCES `user`(`id`)
  ON DELETE SET NULL;

-- Verification: Check the updated schema
SHOW CREATE TABLE `booking`;

-- Test query: This should now work without errors
SELECT * FROM `booking` WHERE `created_by` IS NULL LIMIT 5;

-- Migration complete!
