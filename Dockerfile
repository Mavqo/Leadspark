# syntax = docker/dockerfile:1

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "./dist/server/entry.mjs"]
