import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const ensureSchema = async () => {
  let initialConnection;

  try {
    // Step 1: Connect to MySQL server WITHOUT specifying a database
    initialConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Step 2: Create the database if it doesn't exist
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Database '${process.env.DB_NAME}' ensured.`);

    // Step 3: Switch to the database
    await initialConnection.query(`USE \`${process.env.DB_NAME}\`;`);

    // Step 4: Create tables
    await initialConnection.query(`
      CREATE TABLE IF NOT EXISTS \`user\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        firstname VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user','admin') NOT NULL DEFAULT 'user',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await initialConnection.query(`
      CREATE TABLE IF NOT EXISTS \`room\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INT NOT NULL,
        status ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
        location VARCHAR(255) DEFAULT NULL,
        amenities JSON DEFAULT NULL,
        icon VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await initialConnection.query(`
      CREATE TABLE IF NOT EXISTS \`booking\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        comment TEXT,
        created_by INT NOT NULL,
        status ENUM('confirmed','canceled') NOT NULL DEFAULT 'confirmed',
        canceled_by INT DEFAULT NULL,
        canceled_reason VARCHAR(255) DEFAULT NULL,
        canceled_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES \`room\`(id) ON DELETE CASCADE,
        CONSTRAINT fk_booking_created_by FOREIGN KEY (created_by) REFERENCES \`user\`(id) ON DELETE RESTRICT,
        CONSTRAINT fk_booking_canceled_by FOREIGN KEY (canceled_by) REFERENCES \`user\`(id) ON DELETE SET NULL,
        KEY ix_booking_room_time (room_id, start_time, end_time),
        KEY ix_booking_creator_time (created_by, start_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Database schema ensured.');
  } catch (error) {
    console.error('Error ensuring database schema:', error);
    throw error;
  } finally {
    // Close the initial connection
    if (initialConnection) {
      await initialConnection.end();
    }
  }
};

// Create the connection pool (connections happen lazily on first query)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('MySQL connection pool created.');

// Export a promise that resolves when schema initialization is complete
export const dbReady = ensureSchema();

export default pool;
