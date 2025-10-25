# Backend Dockerfile for 13Rooms Express/Node.js API
# This creates a development container with live-reload capabilities

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
# Note: In docker-compose, this will be overridden by volume mount for live reload
COPY . .

# Expose API server port
EXPOSE 3000

# Start the development server with nodemon for auto-restart
# If package.json has a 'start' script, it will be used
CMD ["npm", "start"]
