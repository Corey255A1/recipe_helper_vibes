# Use official Node.js 22 alpine image for a lightweight runtime
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directory for recipe storage
RUN mkdir -p /data/recipes

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV DATA_DIR=/data
ENV NODE_ENV=production

# Define persistent storage volume
VOLUME ["/data"]

# Run the server
CMD ["node", "server/index.js"]
