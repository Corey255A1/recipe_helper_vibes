# Use official Node.js 22 alpine image for a lightweight runtime
FROM node:22-alpine

# Install git for in-app zero-rebuild updates
RUN apk add --no-cache git

# Set working directory inside container
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --omit=dev

# Copy source code
COPY . .
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV DATA_DIR=/data
ENV NODE_ENV=production

# Run the supervisor entrypoint so in-app updates can restart Node without stopping the container
CMD ["/bin/sh", "/app/entrypoint.sh"]
