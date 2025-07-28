# Base image with all dependencies needed for Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /

# Copy your project files
COPY . .

# Install dependencies
RUN npm install

# Optional: Install Chrome manually (only if needed)
# RUN npx puppeteer browsers install chrome

# Expose port (if using web server; optional)
EXPOSE 3000

# Command to run your app (adjust as needed)
CMD ["node", "src/server.mjs"]
