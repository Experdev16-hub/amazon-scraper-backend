# Base image with all dependencies needed for Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /app

# Copy your project files
COPY . .

# Install dependencies
RUN npm install

# Optional: Install Chrome manual# Use a Puppeteer-friendly base image
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy all files into the container
COPY . .

# Fix permissions BEFORE switching user
RUN chown -R pptruser:pptruser /app

# Switch to the pptruser (non-root) for security
USER pptruser

# Install dependencies using Puppeteer’s cache directory
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer
RUN npm install

# Expose your port if needed (e.g., 3000)
EXPOSE 3000

# Command to run your app
CMD ["npm", "start"]
ly (only if needed)
# RUN npx puppeteer browsers install chrome

# Expose port (if using web server; optional)
EXPOSE 3000

# Command to run your app (adjust as needed)
CMD ["node", "src/server.mjs"]
