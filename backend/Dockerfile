FROM node:20-bookworm-slim

# System FFmpeg (required by fluent-ffmpeg) + build tools for better-sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 make g++ ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Playwright's own Chromium build + the system libraries it needs (fonts,
# GTK, etc.) for the in-dashboard remote-browser feature. This is a real,
# separate headless browser process per active browse session — expect
# noticeably more RAM/CPU use than the video relay alone.
RUN npx playwright install --with-deps chromium

COPY src ./src

RUN mkdir -p /app/data /app/media

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
