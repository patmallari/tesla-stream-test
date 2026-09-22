FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_RELAY_HTTP_URL=http://localhost:4000
ARG VITE_RELAY_WS_URL=ws://localhost:4000
ENV VITE_RELAY_HTTP_URL=$VITE_RELAY_HTTP_URL
ENV VITE_RELAY_WS_URL=$VITE_RELAY_WS_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
