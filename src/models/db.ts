import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Validate required database environment variables at startup
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const ensureSchema = async () => {
  let initialConnection;

  try {
    // Step 1: Connect to MySQL server WITHOUT specifying a database
    initialConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Step 2: Read the init-db.sql file using ABSOLUTE path resolution
    // Navigate from src/models/db.ts up to the project root (13roomsAPI/)
    const sqlFilePath = path.join(__dirname, '..', '..', 'init-db.sql');
    console.log(`Reading database schema from: ${sqlFilePath}`);

    const sqlScript = await fs.readFile(sqlFilePath, 'utf-8');

    // Step 3: Split the SQL script into individual statements
    // Remove comments and split by semicolons
    const statements = sqlScript
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // Step 4: Execute each SQL statement
    for (const statement of statements) {
      if (statement.trim().length > 0) {
        await initialConnection.query(statement);
      }
    }

    console.log(`Database '${process.env.DB_NAME}' schema initialized from init-db.sql`);
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
