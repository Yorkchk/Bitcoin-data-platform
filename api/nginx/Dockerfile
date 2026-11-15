# Build context is the repository root (see docker-compose.yml), so this image
# can build the frontend and serve it next to the API proxy.

# 1. Build the React frontend
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. nginx: serves the built frontend and proxies the API
FROM nginx:alpine

# Delete the default config to be absolutely sure
RUN rm /etc/nginx/conf.d/default.conf

# Where the API listens. Compose reaches it by service name; in Azure Container
# Apps the containers share localhost, so the app sets API_UPSTREAM=127.0.0.1:8000.
ENV API_UPSTREAM=app:8000

# Rendered to /etc/nginx/conf.d/default.conf by the image's entrypoint at start-up
COPY api/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=frontend /frontend/dist /usr/share/nginx/html
