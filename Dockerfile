# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Build stage — Vite build. VITE_API_URL is inlined at build time,
# so it MUST be a build ARG (a runtime env var would do nothing).
# ------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=https://api.sopape.com
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ------------------------------------------------------------------
# Runtime stage — nginx serving the static bundle
# ------------------------------------------------------------------
FROM nginx:alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/cadenflu.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:80/ || exit 1
