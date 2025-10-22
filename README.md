# 13Rooms API Backend

This is the Node.js, Express, and TypeScript backend for the 13Rooms room booking tool.

## Setup

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
