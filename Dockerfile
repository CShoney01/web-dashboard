# ── Stage 1: Build frontend ──────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# ── Stage 2: Install backend production deps ─────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: Final image (Nginx + Node + supervisord) ────────
FROM node:22-alpine AS runner

RUN apk add --no-cache nginx supervisor

# Nginx: static files + config
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Backend
WORKDIR /backend
COPY --from=backend-builder /backend/node_modules ./node_modules
COPY backend/ .

# supervisord
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
