FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .

RUN npm run build


FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache curl

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

LABEL org.opencontainers.image.source="https://github.com/Tenghuyly2330/stock-management"
LABEL org.opencontainers.image.description="HouseStock Stock Management Frontend Client"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]

