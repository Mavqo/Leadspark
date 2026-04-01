# syntax = docker/dockerfile:1

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Tailwind CSS first
RUN npx tailwindcss -i ./src/styles/globals.css -o ./public/styles.css --minify

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public/styles.css ./public/styles.css

# Install only production dependencies
RUN npm install --omit=dev

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "./dist/server/entry.mjs"]
