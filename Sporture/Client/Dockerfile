# Build context is Sporture/ (the parent), because the client imports the API
# contract from ../shared and Docker cannot reach outside its context.

# ---------- build ----------
FROM node:20-alpine AS build

WORKDIR /app/Client

COPY Client/package*.json ./
RUN npm ci

# The contract must land at ../shared relative to the client, matching the
# "@shared/*" path mapping in tsconfig.
COPY shared /app/shared
COPY Client .

# Vite inlines env vars at build time, so the API origin is a build arg rather
# than a runtime variable. Empty by default: same-origin, which is what the
# nginx /api proxy below expects.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/Client/dist /usr/share/nginx/html
COPY Client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
