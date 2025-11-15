import { fakerDE as faker } from '@faker-js/faker';
import pool from '../models/db';

// Helper to get a random item from an array
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- SEEDING CONFIGURATION ---
const NUM_ROOMS = 100;
const NUM_BOOKINGS = 1000;
const START_DATE = new Date('2025-11-15T08:00:00');

export async function runSeed() {
  console.log('--- STARTING DATABASE SEED ---');

  // 1. Clear existing data (optional, but recommended for clean tests)
  console.log('Clearing existing bookings and rooms...');
  await pool.query('DELETE FROM booking');
  await pool.query('DELETE FROM room');
  await pool.query('ALTER TABLE room AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE booking AUTO_INCREMENT = 1');

  // 2. Seed Rooms
  console.log(`Creating ${NUM_ROOMS} rooms...`);
  const roomIds: number[] = [];
  for (let i = 0; i < NUM_ROOMS; i++) {
    const roomName = faker.commerce.productName() + ' Room';
    const capacity = faker.number.int({ min: 4, max: 50 });
    const amenities = faker.helpers.arrayElements(['Projector', 'Whiteboard', 'Coffee Machine', 'Video Conferencing'], { min: 1, max: 3 });

    const [result] = await pool.query<any>(
      'INSERT INTO room (name, capacity, status, amenities, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [roomName, capacity, 'active', JSON.stringify(amenities)]
    );
    roomIds.push(result.insertId);
  }
  console.log(`${NUM_ROOMS} rooms created.`);

  // 3. Seed Bookings
  console.log(`Creating ${NUM_BOOKINGS} bookings...`);
  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const roomId = getRandomItem(roomIds);
    const bookingTitle = faker.lorem.words(3);

    // Generate random start time within the next 7 days
    const bookingDate = new Date(START_DATE.getTime() + faker.number.int({ max: 7 }) * 24 * 60 * 60 * 1000);
    bookingDate.setHours(faker.number.int({ min: 8, max: 18 }));
    bookingDate.setMinutes(getRandomItem([0, 15, 30, 45]));

    const duration = getRandomItem([30, 60, 90, 120]); // in minutes
    const bookingEndDate = new Date(bookingDate.getTime() + duration * 60 * 1000);

    // Convert to our timezone-naive string format
    const formatForDB = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

    const startTimeStr = formatForDB(bookingDate);
    const endTimeStr = formatForDB(bookingEndDate);

    // Simple conflict check to avoid too many errors
    const [conflicts] = await pool.query<any[]>(
      'SELECT id FROM booking WHERE room_id = ? AND start_time < ? AND end_time > ?',
      [roomId, endTimeStr, startTimeStr]
    );

    if (conflicts.length === 0) {
      await pool.query(
        'INSERT INTO booking (room_id, name, start_time, end_time, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [roomId, bookingTitle, startTimeStr, endTimeStr, 1] // Assume created by admin (user ID 1)
      );
    }
  }
  console.log(`Approx. ${NUM_BOOKINGS} booking attempts made.`);

  console.log('--- DATABASE SEED COMPLETE ---');
}
