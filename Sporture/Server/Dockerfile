# Build context is Sporture/Server — the server has no imports from ../shared
# (only the client does), so it builds standalone.

# ---------- build ----------
# Compiles TypeScript with devDependencies present, so the runtime stage can
# install production deps only.
FROM node:20-alpine AS build

WORKDIR /app

# Copied before the source so a source-only edit reuses the cached install.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Uploads are written at runtime; compose mounts a volume here so they survive
# a container rebuild.
RUN mkdir -p uploads && chown -R node:node /app

# node:alpine ships an unprivileged `node` user. Running as root would mean a
# container escape starts with root in the host namespace.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
