FROM node:20-slim

# Install Chrome dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf "$(which chromium || which chromium-browser)" /usr/local/bin/chromium-puppet

# Tell Puppeteer to use system Chromium, skip bundled download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium-puppet

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

EXPOSE 3000
CMD ["node", "src/index.js"]
