FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy everything else
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the server
CMD ["node", "server/index.js"]
