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

RUN npm ci --only=production --verbose

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
