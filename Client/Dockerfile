FROM node:20-alpine AS build

WORKDIR /app/Client

COPY Client/package*.json ./
RUN npm ci

COPY shared /app/shared
COPY Client .

ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/Client/dist /usr/share/nginx/html
COPY Client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
