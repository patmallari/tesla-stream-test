FROM node:20-bookworm-slim

# System FFmpeg (required by fluent-ffmpeg) + build tools for better-sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 make g++ ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p /app/data /app/media

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
