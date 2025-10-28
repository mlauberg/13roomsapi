FROM node:20-alpine AS development

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --verbose

COPY . .

EXPOSE 3000

# Use ts-node-dev for development with live-reload
# This works with volume mounts and compiles TypeScript in-memory
CMD ["npm", "start"]

FROM node:20-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./

# Install ALL dependencies first (including devDependencies for TypeScript compiler)
RUN npm install --verbose

COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --omit=dev

EXPOSE 3000

# Run the compiled JavaScript from dist folder
CMD ["node", "dist/server.js"]
