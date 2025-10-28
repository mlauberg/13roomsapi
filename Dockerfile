# Backend Dockerfile for 13Rooms Express/Node.js API
# Multi-stage build for both development and production

# Stage 1: Base image with common dependencies
FROM node:20-alpine AS base

# Install wget for healthchecks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Development build
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the rest of the application code
# Note: In docker-compose, this will be overridden by volume mount for live reload
COPY . .

# Expose API server port
EXPOSE 3000

# Start the development server with nodemon for auto-restart
CMD ["npm", "start"]

# Stage 3: Production build
FROM base AS production

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose API server port
EXPOSE 3000

# Start the server in production mode
CMD ["node", "src/server.js"]
