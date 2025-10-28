FROM node:20-alpine AS development

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --verbose

COPY . .

EXPOSE 3000

CMD ["npm", "start"]

FROM node:20-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./

# Using npm install for more flexibility
# Note: npm install is more forgiving with lock file sync issues
# For production-only dependencies, use: npm install --omit=dev
RUN npm install --omit=dev --verbose

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
