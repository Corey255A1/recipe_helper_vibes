# Use official Node.js 22 alpine image for a lightweight runtime
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV DATA_DIR=/data
ENV NODE_ENV=production

# Run the server
CMD ["node", "server/index.js"]
