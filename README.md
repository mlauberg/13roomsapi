# 13Rooms API Backend

This is the Node.js, Express, and TypeScript backend for the 13Rooms room booking tool.

## Getting Started with Docker (Recommended)

The easiest way to run the backend is using Docker. This will automatically set up both the database and API server.

### Prerequisites

- Docker Desktop installed and running
  - Windows/Mac: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/)

### Quick Start

1. **Navigate to the backend directory:**

   ```bash
   cd 13roomsAPI
   ```

2. **Optional - Configure environment variables:**

   Create a `.env` file in this directory:

   ```env
   DB_PASSWORD=your_secure_password
   DB_USER=13rooms_user
   ```

   If you skip this step, default values will be used.

3. **Start everything with one command:**

   ```bash
   docker compose up --build
   ```

4. **Wait for startup** (takes 1-2 minutes on first run)

   You'll see messages like:

   ```
   ✔ Container 13rooms-api-database  Healthy
   ✔ Container 13rooms-api-backend   Started
   ```

5. **Access the API:**

   - API Base URL: http://localhost:3000/api
   - Test endpoint: http://localhost:3000/api/rooms
   - Database: localhost:3306 (for external tools)

### Stopping the Services

Press `Ctrl+C` in the terminal, or run:

```bash
docker compose down
```

To completely reset (remove all data):

```bash
docker compose down -v
docker compose up --build
```

### What Gets Started?

The Docker setup includes:

- **MySQL 8.0 Database**
  - Automatically initialized with the correct schema
  - Persistent data storage
  - Health checks ensure proper startup

- **Node.js Backend API**
  - Live-reload for development (changes to code automatically restart the server)
  - TypeScript compilation handled automatically
  - Connects to database automatically

---

## Manual Setup (Without Docker)

1.  **Clone the repository** (if not already done).
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your database credentials:
    ```
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    DB_NAME=13rooms
    ```
    **Important:** Replace `your_mysql_password` with your actual MySQL root password.

4.  **Create Database Tables:**
    Ensure your MySQL database (`13rooms`) exists and create the following tables:

    **`rooms` table:**
    ```sql
    CREATE TABLE rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INT NOT NULL,
        status VARCHAR(50) NOT NULL
    );
    ```

    **`bookings` table:**
    ```sql
    CREATE TABLE bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        comment TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );
    ```

## Running the Server

To start the development server with live reloading:

```bash
npm start
```

The server will run on `http://localhost:3000`.

## API Endpoints

All API endpoints are prefixed with `/api`.

### Rooms
-   `GET /api/rooms`: Get all rooms.
-   `POST /api/rooms`: Create a new room.
-   `PUT /api/rooms/:id`: Update a room by ID.
-   `DELETE /api/rooms/:id`: Delete a room by ID.

### Bookings
-   `GET /api/bookings`: Get all bookings.
-   `POST /api/bookings`: Create a new booking.
-   `DELETE /api/bookings/:id`: Delete a booking by ID.
