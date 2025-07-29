# Dockerfile
FROM node:20-bookworm-slim

# Chrome/Chromium dependencies + chromium itself
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libnspr4 \
    libnss3 \
    libgbm1 \
    libu2f-udev \
    xdg-utils \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*


# App files
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Tell the app where Chromium is
ENV CHROME_PATH=/usr/bin/chromium-browser
# Set the environment to production
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Good defaults for Chrome in containers
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --no-zygote --disable-dev-shm-usage --disable-gpu"
# Expose the port your server runs on
EXPOSE 3000

RUN chromium-browser --version
# Install any additional dependencies your app needs
RUN npm install --omit=dev

# Start your server (adjust as needed)
CMD ["node", "src/server.mjs"]
