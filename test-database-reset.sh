#!/bin/bash

# Test Script: Reset Database and Verify Guest Booking Schema
# This script automates the database reset process to test the init-db.sql fix

echo "================================================"
echo "Database Reset Test Script"
echo "================================================"
echo ""

# Get database credentials from .env file
source .env

echo "Step 1: Stopping any running backend server..."
echo "(Press Ctrl+C if server is running in another terminal)"
echo ""

echo "Step 2: Dropping existing database..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"

if [ $? -eq 0 ]; then
    echo "✓ Database dropped successfully"
else
    echo "✗ Failed to drop database. Please check your MySQL credentials."
    exit 1
fi

echo ""
echo "Step 3: Starting backend server (this will recreate the database)..."
echo "The server will read init-db.sql and create the schema with nullable created_by"
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Start the server (this will run ensureSchema() which reads init-db.sql)
npm start &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
echo "Waiting 5 seconds for database initialization..."
sleep 5

echo ""
echo "Step 4: Verifying database schema..."
echo "Checking if created_by column allows NULL values..."
echo ""

# Check the schema
SCHEMA_CHECK=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -D "$DB_NAME" -e "DESCRIBE booking;" | grep created_by)

echo "Schema for created_by column:"
echo "$SCHEMA_CHECK"
echo ""

if echo "$SCHEMA_CHECK" | grep -q "YES"; then
    echo "✓✓✓ SUCCESS! The created_by column now allows NULL values!"
    echo "✓✓✓ Guest bookings should now work!"
else
    echo "✗✗✗ FAILED! The created_by column still does NOT allow NULL values."
    echo "✗✗✗ Please check the init-db.sql file and db.ts path resolution."
fi

echo ""
echo "================================================"
echo "Server is running. Press Ctrl+C to stop."
echo "================================================"
echo ""
echo "You can now test guest booking from the frontend at http://localhost:4200"

# Wait for server to be manually stopped
wait $SERVER_PID
